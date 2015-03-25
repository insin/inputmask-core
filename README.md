# inputmask-core [![Build Status](https://secure.travis-ci.org/insin/inputmask-core.png)](http://travis-ci.org/insin/inputmask-core)

A standalone input mask implementation, which is independent of any GUI.

`InputMask` encapsulates editing operations on a string which must conform to a
fixed-width pattern defining editable positions and the types of data they may
contain, plus optional static characters which may not be edited.

## Install

```
npm install inputmask-core
```

## Usage

Importing and creating an instance:

```javascript
var InputMask = require('inputmask-core')

var mask = new InputMask({pattern: '11/11/1111'})
```

Examples of editing a mask:

```javascript
/*  Invalid input is rejected */
mask.input('a')
// → false

/* Valid input is accepted */
mask.input('1')
// → true
mask.getValue()
// → '1_/__/____'

/* Editing operations update the cursor position */
mask.selection
// → {start: 1, end: 1}

/* Pasting is supported */
mask.paste('2345678')
// → true
mask.getValue()
// → '12/34/5678'

/* Backspacing is supported */
mask.backspace()
// → true
mask.getValue()
// → '12/34/567_'

/* Editing operations also know how to deal with selected ranges */
mask.selection = {start: 0, end: 9}
mask.backspace()
// → true
mask.getValue()
// → '__/__/____'
```

## API

See the [Types](#types) section below for type definitions referenced in this
section.

## `InputMask(options: `[`InputMaskOptions`](#inputmaskoptions)`)`

Constructs a new `InputMask` - use of `new` is optional, so these examples are
equivalent:

```javascript
var mask = new InputMask({pattern: '1111-1111', value: '12345678'})
```
```javascript
var mask = InputMask({pattern: '1111-1111', value: '12345678'})
```

## `InputMask` public properties, getters & setters

### `selection` : `Selection`

The current selection within the input.

If `start` and `end` are the same, this indicates the current cursor position in
the string, otherwise it indicates a range of selected characters within the
string.

`selection` will be updated as necessary by editing methods, e.g. if you
`input()` a valid character, `selection` will be updated to place the cursor
after the newly-inserted character.

If you're using `InputMask` as the backend for an input mask in a GUI, make
sure `selection` is accurate before calling any editing methods!

### `setSelection(selection: Selection)` : `boolean`

Sets the selection and performs an editable cursor range check if the selection
change sets the cursor position (i.e. `start` and `end` are the same).

If the mask's pattern begins or ends with static characters, this method will
prevent the cursor being placed prior to a leading static character or beyond a
tailing static character. Only use this method to set `selection` if this is
the behaviour you want.

Returns `true` if the selection needed to be adjusted as described above,
`false` otherwise.

### `getValue()` : `string`

Gets the current value in the mask, which will always conform to the mask's
pattern.

### `setValue(value: string)`

Overwrites the current value in the mask.

The given value will be applied to the mask's pattern, with invalid - or
missing - editable characters replaced with placeholders.

The value may optionally contain static parts of the mask's pattern.

### `setPattern(pattern: string, value: ?string)`

Overwrites the mask's pattern.

A new value can also be provided - if not provided, the value will default to
blank, clearing the mask.

## `InputMask` editing methods

Editing methods will not allow the string being edited to contain invalid
values according to the mask's pattern.

Any time an editing method results in either the value or the selection
changing, it will return `true`.

Otherwise, if an invalid (e.g. trying to input a letter where the pattern
specifies a number) or meaningless (e.g. backspacing when the cursor is at the
start of the string) editing operation is attempted, it will return `false`.

### `input(character: string)` : `boolean`

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

### `backspace()` : `boolean`

Performs a backspace operation based on the current selection.

* If a text selection has been made, editable characters within the selection
  will be blanked out and the cursor will be placed at the start of the
  .selection

* If the cursor is positioned after an editable character, that character will
  be blanked out and the cursor will be placed before it.

* If the cursor is positioned after a static part of the mask, the cursor will
  be placed before it.

### `paste(input: string)`: `boolean`

Applies a string of input based on the current selection.

This behaves the same as - and is effectively like - calling `input()` for each
character in the given string *with one key difference* - if any character
within the input is determined to be invalid, the entire paste operation fails
and the mask's value and selection are unaffected.

Pasted input may optionally contain static parts of the mask's pattern.

## Types

These type definitions are purely for reference, they're not part of the
API exported by this module.

### `Selection` : `{start: number; end: number}`

An object with `start` and `end` properties, where `end >= start`.

### `InputMaskOptions`

#### `{pattern: string, value: ?string, selection: ?Selection}`

Options for the `InputMask` constructor.

#### `pattern`

A masking pattern.

The following characters signify editable parts of the mask:

* `1` - number
* `A` - letter
* `*` - alphanumeric

If you need to include one of these characters as a static part of the pattern,
you can escape then with a preceding backslash:

```javascript
var mask = new InputMask({pattern: '\\A11 \\1AA', value: 'A99 1ZZ'})
mask.getValue()
// → 'A99 1ZZ'
```

If you need to include a static backslash in a pattern, you must escape it:

```javascript
var mask = new InputMask({pattern: '\\\\A11\\\\', value: 'Z98'})
mask.getValue()
// → '\\Z98\\'
```

Otherwise, all other characters are treated as static parts of the pattern.

A pattern must be provided and must contain at least one editable character, or
an `Error` will be thrown.

##### Example patterns

* Credit card number: `1111 1111 1111 1111`
* Date: `11/11/1111`
* ISO date: `1111-11-11`
* Time: `11:11`
* Canadian postal code: `A1A 1A1`
* Norn Iron license plate: `AAA 1111`

#### `value`

An optional initial value for the mask - see [`setValue()`](#setvaluevalue-string)
above for more details.

#### `selection`

An optional default selection - see [`selection`](#selection-selection)
above for more details.

## MIT Licensed