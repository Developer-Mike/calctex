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

const CALCULATE_TRIGGER_SYMBOL = " =";

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
      var mathBegin: number|null = null;

      syntaxTree(view.state).iterate({
        from,
        to,
        enter(node: any) {
          let nodeTags = node.type.name.split("_")

          if (nodeTags.contains("formatting-math-begin"))
            mathBegin = node.to;
          if (nodeTags.contains("formatting-math-end") && mathBegin != null) {
            let mathEnd = node.from;
            if (cursorPos < mathBegin || mathEnd < cursorPos) return;

            let formula = view.state.sliceDoc(mathBegin, mathEnd);
            if (!formula.trim().endsWith(CALCULATE_TRIGGER_SYMBOL)) return;

            // Count the length of the formula without newlines
            let formulaLength = formula.replace("\n", "").length;
            let insertIndex = mathBegin + formulaLength;
            
            const calculationEngine = new ComputeEngine();
            calculationEngine.latexOptions = {
              multiply: "*",
              groupSeparator: "'",
            };

            let formattedFormula = formula.trim().slice(0, -CALCULATE_TRIGGER_SYMBOL.length).trim();
            let result = calculationEngine.parse(formattedFormula).evaluate().latex;

            var resultString = ` ${result}`;
            if (result.toLowerCase().contains("error")) resultString = ` ⚡`;

            builder.add(
              insertIndex,
              insertIndex,
              Decoration.replace({
                widget: new ResultWidget(view, insertIndex, resultString),
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

// Editor.getDoc().getCursor() -> {line, ch}
// Editor.getDoc().replaceRange(text, from, to, origin)