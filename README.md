# Obsidian Markup Plugin
This is an [Obsidian](https://obsidian.md/) plugin created to simply and unobtrusively solve a simple problem: *Changing text color and highlighting blocks of text.*

https://github.com/user-attachments/assets/444efa5c-12c3-48f1-a37e-13812a716973

## Philosophy
This plugin tries its best to be minimal, and adhere to keeping your markdown files as un-"meddled with" as possible. To color and highlight text it wraps them in a **\<span\>** tag with its own *style* attribute. Because of this it is incompatible with the existing **bold** and *italic* in markdown, so it implements that in the *style* as well.

It's technically a **work-in-progress** as I haven't fully put it through its paces, however I'm not really looking to add any extra features to it at this point.
## Usage
Using the new menu options on the status bar you can select from 1 of 5 options for either coloring or highlighting text. This same menu allows you to toggle whether the selected text will be bold or italic as well on subsequent triggers.

Simply select the text you want to color or highlight, and interact with the menu. When removing formatting, you must select the text as well as the **\<span\>** tags on both sides. This is easily accomplished by clicking on the colored/highlighted text, and Obsidian will select all of that for you.
### Commands
In addition to the menu you can control all of these things via commands as well:
- Markup: Toggle bold status
- Markup: Toggle italic status
- Markup: Remove formatting from selected text
- Markup: Color selected text (Color *1-5*)
- Markup: Highlight selected text (Color *1-5*)
## Customization
The colors are all customizable within the settings menu. I tried to pick sensible defaults, with options that mostly look decent on both light and dark backgrounds, but you're free to change them as you wish.

![image](https://github.com/user-attachments/assets/c8c440c1-49a6-434c-a4d3-1fd02af4dae4)

