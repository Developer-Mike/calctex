import { EditorView, WidgetType } from "@codemirror/view";
import CalctexPlugin from "./main";

export class ResultWidget extends WidgetType {
  insertLocation: number;
  resultText: string;
  keyListener: (event: KeyboardEvent) => void;

  constructor(public view: EditorView, public index: number, public text: string) {
    super();
  }

  toDOM(_view: EditorView): HTMLElement {
    document.removeEventListener("keydown", this.keyListener, true);

    const div = document.createElement("span");
    div.className = "result-text";
    
    this.insertLocation = this.index;
    this.resultText = this.text;

    div.innerText = this.text;
    this.keyListener = (event) => {
      if (event.key !== CalctexPlugin.INSTANCE.settings.completionTriggerKey) return;
      event.preventDefault();
      this.insertToDOM();
    }
    document.addEventListener("keydown", this.keyListener, true);
    div.onclick = () => { this.insertToDOM(); };

    return div;
  }

  destroy(dom: HTMLElement): void {
    document.removeEventListener("keydown", this.keyListener, true);
    dom.remove();
  }

  insertToDOM() {
    const transaction = this.view.state.update({
      changes: {
        from: this.insertLocation,
        to: this.insertLocation,
        insert: this.resultText,
      },
      selection: {
        anchor: this.insertLocation + this.resultText.length,
        head: this.insertLocation + this.resultText.length,
      }
    });
    this.view.dispatch(transaction);

    document.removeEventListener("keydown", this.keyListener, true);
  }
}