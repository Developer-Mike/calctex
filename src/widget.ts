import { EditorView, WidgetType } from "@codemirror/view";

export class ResultWidget extends WidgetType {
  constructor(public view: EditorView, public index: number, public text: string) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const div = document.createElement("span");
    div.className = "result-text";

    div.innerText = this.text;
    div.onclick = () => {
      // Insert the result into the editor
      const transaction = view.state.update({
        changes: {
          from: this.index,
          to: this.index,
          insert: this.text,
        },
      });
      view.dispatch(transaction);
    };

    return div;
  }
}