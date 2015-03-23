# inputmask-core [![Build Status](https://secure.travis-ci.org/insin/inputmask-core.png)](http://travis-ci.org/insin/inputmask-core)

An input mask without a GUI.

`InputMask` encapsulates editing operations on a string which must conform to a
pattern defining editable positions and the types of data they may contain, plus
optional static chracters which may not be edited.

# API

## Constructor

```
InputMask(options: {
  pattern: string,
  selection: ?{start: number, end: number},
  value: ?string
})
```

Constructs a new `InputMask` - use of `new` is optional, so these examples are
equivalent:

```javascript
var mask = new InputMask({pattern: '####-####', value: '12345678'})
```
```javascript
var mask = InputMask({pattern: '####-####', value: '12345678'})
```

### `pattern`

A masking pattern. The following characters signify editable parts of the mask:

* `#` - numeric character
* ...more TBD

All other characters are treated as static.

#### Example patterns

* Credit card number: `#### #### #### ####`
* Date: `##/##/####`
* ISO date: `####-##-##`
* Time: `##:##`

### `selection`

Default selection - see below.

### `value`

An optional initial value for the mask - this will be applied to the pattern,
with invalid - or missing - editable characters replaced with placeholders.

This value may optionally contain static parts of the mask's pattern.

## Public properties & getters

### `selection: {start: number; end: number}`

An object with numeric `start` and `end` properties, where `end >= start`.

If `start` and `end` are the same, this indicates the current cursor position in
the string, otherwise it indicates a range of selected characters within the
string.

You are responsible for ensuring the selection is accurate before calling any
editing operations.

### `getValue(): string`

Gets the current value of the string, which will always conform to the mask's
pattern.

## Editing operations

Editing operations will not allow the string being edited to contain invalid
values according to the mask's pattern.

Any time an editing operation results in either the value or the selection
changing, it will return `true`.

Otherwise, if an invalid (e.g. trying to input a letter where the pattern
specifies a number) or meaningless (e.g. backspacing when the cursor is at the
start of the string) operation is attempted, it will return `false`.

### `input(character: string): boolean`

Applies a single character of input based on the current selection.

* If a text selection has been made, editable characters within the selection
  will be blanked out, the cursor will be moved to the start of the selection
  and input will proceed as below.

* If the cursor is positioned before an editable character and the input is
  valid, the input will be added. The cursor will then be advanced to the next
  editable character in the mask.

* If the cursor is positioned before a static part of the mask, the cursor will
  be advanced to the next editable character.

After input has been added, the cursor will be advanced to the next editable
character position.

### `backspace(): boolean`

Performs a backspace operation based on the current selection.

* If a text selection has been made, editable characters within the selection
  will be blanked out and the cursor will be placed at the start of the
  .selection

* If the cursor is positioned after an editable character, that character will
  be blanked out and the cursor will be placed before it.

* If the cursor is positioned after a static part of the mask, the cursor will
  be placed before it.

### `paste(input: string): boolean`

Applies a string of input based on the current selection.

This behaves the same as - and is effectively like - calling `input()` for each
character in the given string *with one key difference* - if any character
within the input is determined to be invalid, the entire paste operation fails
and the mask's value and selection are unaffected.

Pasted input may optionally contain static parts of the mask's pattern.

## MIT Licensed