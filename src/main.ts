import { Plugin } from 'obsidian';
import { calctexHintRenderer } from './editor';

export default class CalctexPlugin extends Plugin {
	async onload() {
    this.registerEditorExtension([calctexHintRenderer]);
	}

	onunload() {}
}