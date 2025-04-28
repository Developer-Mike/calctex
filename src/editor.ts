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

    for (let { from, to } of view.visibleRanges) {
      let cursorPos = view.state.selection.main.from;
      let mathBegin: number|null = null;

      syntaxTree(view.state).iterate({
        from,
        to,
        enter(node: any) {
          let nodeTags = node.type.name.split("_")

          if (nodeTags.contains("formatting-math-begin"))
            mathBegin = node.to;
          if (nodeTags.contains("formatting-math-end") && mathBegin != null) {
            let mathEnd = node.from;

            // If not editing
            if (cursorPos < mathBegin || mathEnd < cursorPos) return;
            let relativeCursorPos = cursorPos - mathBegin;

            // Get focused latex line
            let latexContentLines = view.state.sliceDoc(mathBegin, mathEnd).split("\n");
            let focusedLatexLine = latexContentLines.find((_line, i) => 
              relativeCursorPos < latexContentLines.slice(0, i + 1).join("\n").length + 1
            ) ?? "";
            let previousLatexLines = latexContentLines.slice(0, latexContentLines.indexOf(focusedLatexLine));

            // If not ending with the trigger symbol
            if (!focusedLatexLine.replace("\\\\", "").trim().endsWith(CalctexPlugin.INSTANCE.settings.calculationTriggerString) && !focusedLatexLine.replace("\\\\", "").trim().endsWith(CalctexPlugin.INSTANCE.settings.approxCalculationTriggerString)) return;

            const trimmedLatexLine = focusedLatexLine.replace("\\\\", "").trim();

            let calcTrigger = null;
            if (trimmedLatexLine.endsWith(CalctexPlugin.INSTANCE.settings.calculationTriggerString))
                calcTrigger = CalctexPlugin.INSTANCE.settings.calculationTriggerString;
            else if (trimmedLatexLine.endsWith(CalctexPlugin.INSTANCE.settings.approxCalculationTriggerString))
                calcTrigger = CalctexPlugin.INSTANCE.settings.approxCalculationTriggerString;

            if (calcTrigger == null) return;

            // Get the exact formula to calculate
            let splitFormula = focusedLatexLine.split(calcTrigger).filter((part) => part.replace("\\\\", "").trim().length > 0);
            let formula = splitFormula[splitFormula.length - 1];

            // Create a new calculation engine
            const calculationEngine = new ComputeEngine();
            calculationEngine.latexOptions = {
              decimalMarker: CalctexPlugin.INSTANCE.settings.decimalSeparator,
              multiply: CalctexPlugin.INSTANCE.settings.multiplicationSymbol,
              groupSeparator: CalctexPlugin.INSTANCE.settings.groupSeparator,
            };

            let formattedFormula = formula.replace("\\\\", "").replace("&", "");
            let expression = calculationEngine.parse(formattedFormula);

            // Add variables from previous lines
            for (let previousLine of previousLatexLines) {
              try {
                // Remove the last line break and align sign
                let formattedPreviousLine = previousLine.replace("\\\\", "").replace("&", "")
                let lineExpression = calculationEngine.parse(formattedPreviousLine).simplify();

                let lineExpressionParts = lineExpression.latex.split("=");
                if (lineExpressionParts.length <= 1) continue;

                let jsonValue = calculationEngine.parse(lineExpressionParts[lineExpressionParts.length - 1].trim()).json;
                
                expression = expression.subs({
                  [lineExpressionParts[0].trim()]: jsonValue
                });
              } catch (e) { console.error(e); }
            }

            // Calculate the expression
            const isApproximation = calcTrigger === CalctexPlugin.INSTANCE.settings.approxCalculationTriggerString;
            let result = null;
            if (expression.isValid) {
                const evaluation = expression.evaluate();
                result = (isApproximation ? evaluation.N() : evaluation).latex;
              } else result = "⚡";

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
