//@ts-ignore
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import {
	Decoration,
	DecorationSet,
	EditorView,
	PluginSpec,
	PluginValue,
	ViewPlugin,
  ViewUpdate
} from "@codemirror/view";
import { ResultWidget } from "src/widget";
import { ComputeEngine } from '@cortex-js/compute-engine';
import CalctexPlugin from "./main";

class CalctexHintRenderer implements PluginValue {
	decorations: DecorationSet;

	constructor(view: EditorView) {
		this.decorations = this.buildDecorations(view);
	}

	update(update: ViewUpdate) {
		this.decorations = this.buildDecorations(update.view);
	}

	destroy() {}

	buildDecorations(view: EditorView): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();

		for (const { from, to } of view.visibleRanges) {
			const cursorPos = view.state.selection.main.from;
			let mathBegin: number | null = null;

			syntaxTree(view.state).iterate({
				from,
				to,
				enter(node: any) {
					const nodeTags = node.type.name.split("_");

					if (nodeTags.contains("formatting-math-begin"))
						mathBegin = node.to;
          if (nodeTags.contains("formatting-math-end") && mathBegin != null) {
            const mathEnd = node.from;

						// If not editing
            if (cursorPos < mathBegin || mathEnd < cursorPos) return;
            const relativeCursorPos = cursorPos - mathBegin;

						// Get focused latex line
            const latexContentLines = view.state.sliceDoc(mathBegin, mathEnd).split("\n");
            const focusedLatexLine = latexContentLines.find((_line, i) => 
              relativeCursorPos < latexContentLines.slice(0, i + 1).join("\n").length + 1
							) ?? "";
            const trimmedLatexLine = focusedLatexLine.replace("\\\\", "").trim();
            const previousLatexLines = latexContentLines.slice(0, latexContentLines.indexOf(focusedLatexLine));

						// If not ending with the trigger symbol
            if (!trimmedLatexLine.endsWith(CalctexPlugin.INSTANCE.settings.calculationTriggerString) && !trimmedLatexLine.endsWith(CalctexPlugin.INSTANCE.settings.approxCalculationTriggerString)) return;

						// Able to use calculationTrigger and approxCalculationTrigger in one Line
						// ex) \frac{-15 + \sqrt{(15)^2 -4 \cdot 2}}{2} = \frac{\sqrt{217}}{2}-\frac{15}{2} \approx -0.134\ldots
            const calcTrigger = new RegExp(`${CalctexPlugin.INSTANCE.settings.calculationTriggerString}|${CalctexPlugin.INSTANCE.settings.approxCalculationTriggerString.replace("\\", "\\\\")}`);

						// Check if the line ends with approxCalculationTriggerString
						const isApproximation = trimmedLatexLine.endsWith(CalctexPlugin.INSTANCE.settings.approxCalculationTriggerString);

						// Get the exact formula to calculate
            const splitFormula = focusedLatexLine.split(calcTrigger).filter((part) => part.replace("\\\\", "").trim().length > 0);
            const formula = splitFormula[splitFormula.length - 1];

						// Create a new calculation engine
						const calculationEngine = new ComputeEngine();

						const latexOptions = {
							prettify: true,
							multiply: CalctexPlugin.INSTANCE.settings.multiplicationSymbol,
							decimalSeparator: CalctexPlugin.INSTANCE.settings.decimalSeparator,
							digitGroupSeparator : CalctexPlugin.INSTANCE.settings.groupSeparator,
							fractionalDigits: (isApproximation && CalctexPlugin.INSTANCE.settings.approxDecimalPrecision !== -1 ) 
								? CalctexPlugin.INSTANCE.settings.approxDecimalPrecision
								: "auto" as 'auto',
						};

            const formattedFormula = formula.replace("\\\\", "").replace("&", "");
            let expression = calculationEngine.parse(formattedFormula);

						// Add variables from previous lines
						for (const previousLine of previousLatexLines) {
							try {
								// Remove the last line break and align sign
								const formattedPreviousLine = previousLine.replace("\\\\", "").replace("&", "");
								const lineExpression = calculationEngine.parse(formattedPreviousLine).simplify();

								const lineExpressionParts = lineExpression.latex.split("=");
								if (lineExpressionParts.length <= 1) continue; 

									const jsonValue = calculationEngine.parse(lineExpressionParts[lineExpressionParts.length - 1].trim()).json;
	
									expression = expression.subs({
										[lineExpressionParts[0].trim()]: jsonValue,
									});
              } catch (e) { console.error(e); }
						}

						// Calculate the expression
						let result = null;
						if (expression.isValid) {
							const evaluation = expression.evaluate();
							result = (isApproximation ? evaluation.N() : evaluation).toLatex(latexOptions);
						} else {
							expression.print();
							result = "⚡";
						}

						// Calculate the insertion index
            let insertIndex = mathBegin + previousLatexLines.join("\n").length + focusedLatexLine.replace("\\\\", "").trimEnd().length;
						if (previousLatexLines.length > 0) insertIndex += 1; // Multiline formula with $$

						builder.add(
							insertIndex,
							insertIndex,
							Decoration.replace({
                widget: new ResultWidget(view, insertIndex, ` ${result}`),
							})
						);
					}
				},
			});
		}

		return builder.finish();
	}
}

const pluginSpec: PluginSpec<CalctexHintRenderer> = {
	decorations: (value: CalctexHintRenderer) => value.decorations,
};

export const calctexHintRenderer = ViewPlugin.fromClass(
	CalctexHintRenderer,
	pluginSpec
);
