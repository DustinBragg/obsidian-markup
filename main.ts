import { App, Editor, MarkdownView, Plugin, PluginSettingTab, Setting, Menu, setIcon, setTooltip } from "obsidian";

const NUM_COLORS = 5;

interface markup_plugin_settings {
    Colors[NUM_COLORS]: string;
    HighlightColors[NUM_COLORS]: [string, string]; // text, background
}

const DEFAULT_SETTINGS: markup_plugin_settings = {
    Colors: [
        "#FF0A0A",
        "#00C800",
        "#DD7700",
        "#FFFF00",
        "#00FFFF"
    ],

    HighlightColors: [
        [ "#000000", "#FFFF00" ],
        [ "#000000", "#00FF00" ],
        [ "#FFFFFF", "#FF0000" ],
        [ "#000000", "#00FFFF" ],
        [ "#FFFFFF", "#FF00FF" ]
    ]
}

export default class MarkupPlugin extends Plugin {
    Settings: markup_plugin_settings;
    BoldSelected: false;
    ItalicSelected: false;
    
    async onload() {
        await this.loadSettings();

        // Toggle Bold status
        this.addCommand({
            id: "markup-toggle-bold",
            name: "Toggle bold status",
            editorCallback: () => {
                this.BoldSelected = !this.BoldSelected;
                new Notice("Markup: Bold status " + ((this.BoldSelected)? "ON" : "OFF"));
            }
        });
        this.addCommand({
            id: "markup-toggle-italic",
            name: "Toggle italic status",
            editorCallback: () => {
                this.ItalicSelected = !this.ItalicSelected;
                new Notice("Markup: Italic status " + ((this.ItalicSelected)? "ON" : "OFF"));
            }
        });
        
        // Colored Text
        {
            for (let ColorIndex = 0;
                 ColorIndex < NUM_COLORS;
                 ++ColorIndex) {
                this.addCommand({
                    id: "markup-color-text-" + (ColorIndex + 1),
                    name: "Color selected text (Color " + (ColorIndex + 1) + ")",
                    editorCallback: () => {
                        this.ColorSelectedText(this.Settings.Colors[ColorIndex]);
                    }
                });
            }

            const ColorStatusBarItem = this.addStatusBarItem();
            setIcon(ColorStatusBarItem, "palette");
            setTooltip(ColorStatusBarItem,
                       "Color selected text",
                       { placement: "top" });
            ColorStatusBarItem.classList.add("mod-clickable");
            ColorStatusBarItem.addEventListener("click", this.OpenColorMenu);
            ColorStatusBarItem.Plugin = this;
        }

        // Highlighted Text
        {
            for (let HighlightIndex = 0;
                 HighlightIndex < NUM_COLORS;
                 ++HighlightIndex) {
                this.addCommand({
                    id: "markup-highlight-text-" + (HighlightIndex + 1),
                    name: "Highlight selected text (Highlight " + (HighlightIndex + 1) + ")",
                    editorCallback: () => {
                        this.HighlightSelectedText(this.Settings.HighlightColors[HighlightIndex]);
                    }
                });
            }

            const HighlightStatusBarItem = this.addStatusBarItem();
            setIcon(HighlightStatusBarItem, "highlighter");
            setTooltip(HighlightStatusBarItem,
                       "Highlight selected text",
                       { placement: "top" });
            HighlightStatusBarItem.classList.add("mod-clickable");
            HighlightStatusBarItem.addEventListener("click", this.OpenHighlightMenu);
            HighlightStatusBarItem.Plugin = this;
        }

        // Remove markup
        {
            this.addCommand({
                id: "markup-remove-markup",
                name: "Remove markup from selected text",
                editorCallback: () => {
                    this.RemoveSelectedTextMarkup();
                }
            });

            const RemoveMarkupStatusBarItem = this.addStatusBarItem();
            setIcon(RemoveMarkupStatusBarItem, "remove-formatting");
            setTooltip(RemoveMarkupStatusBarItem,
                       "Remove markup from selected text",
                       { placement: "top" });
            RemoveMarkupStatusBarItem.classList.add("mod-clickable");
            RemoveMarkupStatusBarItem.addEventListener("click", this.OpenRemoveMarkupMenu);
            RemoveMarkupStatusBarItem.Plugin = this;
        }

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new MarkupSettingTab(this.app, this));

    }

    onunload() {

    }

    async loadSettings() {
        this.Settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.Settings);
    }

    GetEditor()
    {
        const Workspace = this.app.workspace;
        if (!Workspace) {
            return null;
        }

        let View = Workspace.getActiveViewOfType(MarkdownView);
        if (!View) {
	    const Leaf = Workspace.activeLeaf;
	    if (Leaf && Leaf.view && Leaf.view.plugin && Leaf.view.plugin.id == "canvas") {
		new Notice("Markup in a canvas is not supported at this time");
	    } else {
		return null;
	    }
        }

        const EditorV = View.editor;
        if (!EditorV) {
            return null;
        }

        return EditorV;
    }

    GetSelectionPositions()
    {
        const EditorV = this.GetEditor();
        if (!EditorV) {
            return [{}, {}];
        }
        
        // TODO: Handle multiple cursors
        const SelectStartP = EditorV.getCursor("from");
        const SelectEndP = EditorV.getCursor("to");
        return [ EditorV.getCursor("from"),
                 EditorV.getCursor("to"),
                 EditorV.getCursor("anchor"),
                 EditorV.getCursor("head"),
               ]
    }

    RemoveSelectedTextMarkup()
    {
        // Verify we have a selection
        const EditorV = this.GetEditor();
        if (!EditorV) {
            return;
        }
        if (!EditorV.somethingSelected()) {
            return;
        }
	
        // Our search queries
        const PrefixRegex = /<span style="[^"]*">/g;
        const PostfixRegex = "</span>";

        // Loop through our selections
	let NewSelections = [];
	for (let SelectionID = 0;
	     SelectionID < EditorV.listSelections().length;
	     ++SelectionID) {
            // Make sure this is even unmarkup-able
	    const Selections = EditorV.listSelections();
	    const ThisSelection = Selections[SelectionID];
	    const Anchor = ThisSelection.anchor;
	    const Head = ThisSelection.head;
	    const From = (Anchor.line > Head.line || Anchor.ch > Head.ch)? Head : Anchor;
	    const To = (Anchor.line > Head.line || Anchor.ch > Head.ch)? Anchor : Head;

	    const CurSelection = EditorV.getRange(From, To);
	    const Hits = CurSelection.match(PrefixRegex);
	    if (!Hits) {
		return;
	    }
	    
	    const NumHits = Hits.length;
	    if (!NumHits) {
		return;
	    }
	    
            // Demarkup the text
            const NewString = (CurSelection.replaceAll(PrefixRegex, "")).replaceAll(PostfixRegex, "");
            EditorV.replaceRange(NewString, From, To);
	}
    }

    MarkupSelectedText(ColorStr: string, HighlightStr: string)
    {
	// Verify we have a selection
        const EditorV = this.GetEditor();
        if (!EditorV) {
            return;
        }
        if (!EditorV.somethingSelected()) {
            new Notice("No text selected!");
            return;
        }

        // Clear existing markup
        this.RemoveSelectedTextMarkup();

        // Build our style string
        const Bold = this.BoldSelected;
        const Italic = this.ItalicSelected;
        const BoldStr = Bold? "font-weight:bold;" : "";
        const ItalicStr = Italic? "font-style:italic;" : "";
        const StyleStr = ColorStr + HighlightStr + BoldStr + ItalicStr;

	// Loop through our selections
	for (let SelectionID = 0;
	     SelectionID < EditorV.listSelections().length;
	     ++SelectionID) {
	    // Re-grab the current selections every loop, since replaceRange will move the text around
	    const Selections = EditorV.listSelections();
	    const ThisSelection = Selections[SelectionID];
	    const Anchor = ThisSelection.anchor;
	    const Head = ThisSelection.head;
	    const From = (Anchor.line > Head.line || Anchor.ch > Head.ch)? Head : Anchor;
	    const To = (Anchor.line > Head.line || Anchor.ch > Head.ch)? Anchor : Head;

            // Replace this selection
            const Prefix = "<span style=\"" + StyleStr + "\">";
            const CurSelection = EditorV.getRange(From, To);
            const Postfix = "</span>";
	    EditorV.replaceRange(Prefix + CurSelection + Postfix, From, To);
	}

        // Bump the cursor forward one if there is room
	// This makes it so we don't have to see the markup after it is applied
	let NewSelections = [];
	const Selections = EditorV.listSelections();
	for (let SelectionID = 0;
	     SelectionID < Selections.length;
	     ++SelectionID) {
	    const ThisSelection = Selections[SelectionID];
            const Head = ThisSelection.head;
	    const CurP = Head.ch;
	    let Line = Head.line;
            let NewP = (CurP >= EditorV.getLine(Line).length)? CurP : CurP + 1;
            if (NewP == CurP && Line != EditorV.lastLine()) { // We are at the end of the line, but there's one below us
		NewP = 0;
		++Line;
            }
	    
	    const NewHead = {ch: NewP, line: Line};
	    NewSelections.push({anchor: NewHead, head: NewHead});
	}

	EditorV.setSelections(NewSelections, 0);
    }
    
    ColorSelectedText(Color: string)
    {
	const ColorStr = "color:" + Color + ";";
	this.MarkupSelectedText(ColorStr, "");
    }

    HighlightSelectedText(Colors: string[])
    {
	const ColorStr = "color:" + Colors[0] + ";";
        const HighlightStr = "background:" + Colors[1] + "BB;";
	this.MarkupSelectedText(ColorStr, HighlightStr);
    }

    DoCheckboxItem(Event, Menu, Setting, Title, Icon)
    {

    }

    OpenColorMenu(Event)
    {
        const EditorV = this.Plugin.GetEditor();
        if (!EditorV) {
            return;
        }
        
        const ColorMenu = new Menu();
        var ItemID = 0;

        ColorMenu.addItem((BoldElement) =>
            {
                BoldElement
                    .setIcon("bold")
                    .setTitle("Bold")
                    .setChecked(this.Plugin.BoldSelected)
                    .onClick(() => {
                        this.Plugin.BoldSelected = !this.Plugin.BoldSelected;
                        BoldElement.setChecked(this.Plugin.BoldSelected);
                        if (!this.Plugin.BoldSelected) {
                            // Workaround for a bug with checkmark toggling.
                            // If we uncheck, disown the icon element.
                            BoldElement.checkIconEl = null;
                        }
                        ColorMenu.showAtMouseEvent(Event);  // Keep the menu open
                    })
            }
        );
        ++ItemID;

        ColorMenu.addItem((ItalicElement) =>
            {
                ItalicElement
                    .setIcon("italic")
                    .setTitle("Italic")
                    .setChecked(this.Plugin.ItalicSelected)
                    .onClick(() => {
                        this.Plugin.ItalicSelected = !this.Plugin.ItalicSelected;
                        ItalicElement.setChecked(this.Plugin.ItalicSelected);
                        if (!this.Plugin.ItalicSelected) {
                            // Workaround for a bug with checkmark toggling.
                            // If we uncheck, disown the icon element.
                            ItalicElement.checkIconEl = null;
                        }
                        ColorMenu.showAtMouseEvent(Event);  // Keep the menu open
                    })
            }
        );
        ++ItemID;

        ColorMenu.addSeparator();
        ++ItemID;

        for (let ColorIndex = 0;
             ColorIndex < NUM_COLORS;
             ++ColorIndex) {
            ColorMenu.addItem((ColorItem) =>
                {
                    ColorItem
                        .setIcon("case-sensitive")
                        .setTitle("Color " + (ColorIndex + 1))
                        .setChecked(false)
                        .onClick(() => {
                            this.Plugin.ColorSelectedText(this.Plugin.Settings.Colors[ColorIndex]);
                            EditorV.focus();
                        })
                }
            );
            const ItemEl = ColorMenu.items[ItemID];
            ItemEl.iconEl.style.color = this.Plugin.Settings.Colors[ColorIndex];
            ++ItemID;
        }

        ColorMenu.showAtMouseEvent(Event);
    }

    OpenHighlightMenu(Event)
    {
        const EditorV = this.Plugin.GetEditor();
        if (!EditorV) {
            return;
        }
        
        const HighlightMenu = new Menu();
        var ItemID = 0;

        HighlightMenu.addItem((BoldElement) =>
            {
                BoldElement
                    .setIcon("bold")
                    .setTitle("Bold")
                    .setChecked(this.Plugin.BoldSelected)
                    .onClick(() => {
                        this.Plugin.BoldSelected = !this.Plugin.BoldSelected;
                        BoldElement.setChecked(this.Plugin.BoldSelected);
                        if (!this.Plugin.BoldSelected) {
                            // Workaround for a bug with checkmark toggling.
                            // If we uncheck, disown the icon element.
                            BoldElement.checkIconEl = null;
                        }
                        HighlightMenu.showAtMouseEvent(Event);  // Keep the menu open
                    })
            }
        );
        ++ItemID;

        HighlightMenu.addItem((ItalicElement) =>
            {
                ItalicElement
                    .setIcon("italic")
                    .setTitle("Italic")
                    .setChecked(this.Plugin.ItalicSelected)
                    .onClick(() => {
                        this.Plugin.ItalicSelected = !this.Plugin.ItalicSelected;
                        ItalicElement.setChecked(this.Plugin.ItalicSelected);
                        if (!this.Plugin.ItalicSelected) {
                            // Workaround for a bug with checkmark toggling.
                            // If we uncheck, disown the icon element.
                            ItalicElement.checkIconEl = null;
                        }
                        HighlightMenu.showAtMouseEvent(Event);  // Keep the menu open
                    })
            }
        );
        ++ItemID;

        HighlightMenu.addSeparator();
        ++ItemID;

        for (let HighlightIndex = 0;
             HighlightIndex < NUM_COLORS;
             ++HighlightIndex) {
            HighlightMenu.addItem((HighlightItem) =>
                {
                    HighlightItem
                        .setIcon("case-sensitive")
                        .setTitle("Highlight " + (HighlightIndex + 1))
                        .setChecked(false)
                        .onClick(() => {
                            this.Plugin.HighlightSelectedText(this.Plugin.Settings.HighlightColors[HighlightIndex]);
                            EditorV.focus();
                        })
                }
            );
            const ItemEl = HighlightMenu.items[ItemID];
            ItemEl.iconEl.style.color = this.Plugin.Settings.HighlightColors[HighlightIndex][0];
            ItemEl.iconEl.style.backgroundColor = this.Plugin.Settings.HighlightColors[HighlightIndex][1];
            ++ItemID;
        }

        HighlightMenu.showAtMouseEvent(Event);
    }

    OpenRemoveMarkupMenu(Event)
    {
        const EditorV = this.Plugin.GetEditor();
        if (!EditorV) {
            return;
        }

        if (!EditorV.somethingSelected()) {
            return;
        }

        EditorV.focus();
        this.Plugin.RemoveSelectedTextMarkup();
    }
}

class MarkupSettingTab extends PluginSettingTab {
    PluginObj: MarkupPlugin;

    constructor(AppObj: App, PluginObj: MarkupPlugin) {
        super(AppObj, PluginObj);
        this.PluginObj = PluginObj;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();

        // Color palette settings
        {
            new Setting(containerEl)
                .setName("Color Palette")
                .setDesc("Set the available colored text menu options.")
                .setHeading();

            for (let ColorIndex = 0;
                 ColorIndex < NUM_COLORS;
                 ++ColorIndex) {
                new Setting(containerEl)
                    .setName("Color " + (ColorIndex + 1))
                    .addExtraButton((ExtraButton) =>
                        ExtraButton
                            .setIcon("rotate-ccw")
			    .setTooltip("Restore default", { placement: "top" })
                            .onClick(async () => {
                                this.PluginObj.Settings.Colors[ColorIndex] =
                                    DEFAULT_SETTINGS.Colors[ColorIndex];
                                await this.PluginObj.saveSettings();
                                this.display(); // Refresh the page
                            })
                    )
                    .addColorPicker((ColorPicker) =>
                        ColorPicker
                            .setValue(this.PluginObj.Settings.Colors[ColorIndex])
                            .onChange(async (Value) => {
                                this.PluginObj.Settings.Colors[ColorIndex] = Value;
                                await this.PluginObj.saveSettings();
                            })
                    );
            }
        }

        // Highlight palette settings
        {
            new Setting(containerEl)
                .setName("Highlight Palette")
                .setDesc("Set the available highlighter menu options. Left value is the text color, right is the background.")
                .setHeading();

            for (let HighlightIndex = 0;
                 HighlightIndex < NUM_COLORS;
                 ++HighlightIndex) {
                new Setting(containerEl)
                    .setName("Highlight " + (HighlightIndex + 1))
                    .addExtraButton((ExtraButton) =>
                        ExtraButton
                            .setIcon("rotate-ccw")
			    .setTooltip("Restore default", { placement: "top" })
                            .onClick(async () => {
                                this.PluginObj.Settings.HighlightColors[HighlightIndex] =
                                    DEFAULT_SETTINGS.HighlightColors[HighlightIndex]
                                await this.PluginObj.saveSettings();
                                this.display(); // Refresh the page
                            })
                    )
                    .addColorPicker((HighlightPicker) =>
                        HighlightPicker
                            .setValue(this.PluginObj.Settings.HighlightColors[HighlightIndex][0])
                            .onChange(async (Value) => {
                                this.PluginObj.Settings.HighlightColors[HighlightIndex][0] = Value;
                                await this.PluginObj.saveSettings();
                            })
                    )
                    .addColorPicker((HighlightPicker) =>
                        HighlightPicker
                            .setValue(this.PluginObj.Settings.HighlightColors[HighlightIndex][1])
                            .onChange(async (Value) => {
                                this.PluginObj.Settings.HighlightColors[HighlightIndex][1] = Value;
                                await this.PluginObj.saveSettings();
                            })
                    );
            }
        }

    }
}
