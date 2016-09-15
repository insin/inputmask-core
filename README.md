# inputmask-core [![Build Status](https://secure.travis-ci.org/insin/inputmask-core.png)](http://travis-ci.org/insin/inputmask-core)

A standalone input mask implementation, which is independent of any GUI.

`InputMask` encapsulates editing operations on a string which must conform to a fixed-width pattern defining editable positions and the types of characters they may contain, plus optional static characters which may not be edited.

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

/* Undo is supported */
mask.undo()
// → true
mask.getValue()
// → '12/34/567_'
mask.selection
// → {start: 0, end: 9}

/* Redo is supported */
mask.redo()
mask.getValue()
// → '__/__/____'
mask.selection
// → {start: 0, end: 0}
```

## API

## `InputMask(options: Object)`

Constructs a new `InputMask` - use of `new` is optional, so these examples are equivalent:

```javascript
var mask = new InputMask({pattern: '1111-1111', value: '1234-5678'})
```
```javascript
var mask = InputMask({pattern: '1111-1111', value: '1234-5678'})
```

## ``InputMask`` options

### `pattern`

A masking pattern must be provided and must contain at least one editable character, or an `Error` will be thrown.

The following format characters define editable parts of the mask:

* `1` - number
* `a` - letter
* `A` - letter, forced to upper case when entered
* `*` - alphanumeric
* `#` - alphanumeric, forced to upper case when entered

If you need to include one of these characters as a static part of the mask, you can escape them with a preceding backslash:

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

#### Example patterns

* Credit card number: `1111 1111 1111 1111`
* Date: `11/11/1111`
* ISO date: `1111-11-11`
* Time: `11:11`
* Canadian postal code: `A1A 1A1`
* Norn Iron license plate: `AAA 1111`

### `formatCharacters`

An object defining additional custom format characters to use in the mask's pattern.

When defining a new format character, a `validate()` function is required and a `format()` function can optionally be defined to modify the validated character before adding it to the mask's value.

For example this is how you would define `w` as a new format character which accepts word character input (alphanumeric or underscore) and forces it to lower case when entered:

```javascript
var mask = new InputMask({
  pattern: 'Awwwww', // An uppercase letter followed by 5 word characters
  formatCharacters: {
    'w': {
      validate: function(char) { return /\w/.test(char) }
      transform: function(char) { return char.toLowerCase() }
    }
  }
})
```

To override a built-in format character, pass its character as a property of this object along with the new definition.

To disable a built-in format character, pass its character as a property of this object with a `null` value:

```javascript
var mask = new InputMask({
  pattern: 'A1111', // Treats the 'A' as static
  formatCharacters: {
    'A': null
  }
})
```

### `placeholderChar` : `string`

The character which is used to fill in editable slots for which there is no input yet when getting the mask's current value.

Defaults to `'_'`; must be a single character.

```javascript
var mask = new InputMask({pattern: '11/11/1111', placeholderChar: ' '})
mask.input('1')
// → true
mask.getValue()
// → '1 /  /    '
```

### `value` : `string`

An optional initial value for the mask.

### `selection` :  `{start: number; end: number}`

An optional default selection - defaults to `{start: 0, end: 0}`, placing the cursor before the first character.

### `isRevealingMask` : `boolean`

An optional property that, if true, progressively shows the mask as input is entered. Defaults to `false`

Example:
Given an input with a mask of `111-1111 x 111`, a value of `47`, and `isRevealingMask` set to `true`, then the input's value is formatted as `47`
Given the same input but with a value of `476`, then the input's value is formatted as `476-`
Given the same input but with a value of `47 3191`, then the input's value is formatted as `47_-3191 x `

## `InputMask` editing methods

Editing methods will not allow the string being edited to contain invalid values according to the mask's pattern.

Any time an editing method results in either the `value` or the `selection` changing, it will return `true`.

Otherwise, if an invalid (e.g. trying to input a letter where the pattern specifies a number) or meaningless (e.g. backspacing when the cursor is at the start of the string) editing operation is attempted, it will return `false`.

### `input(character: string)` : `boolean`

Applies a single character of input based on the current selection.

* If a text selection has been made, editable characters within the selection will be blanked out, the cursor will be moved to the start of the selection and input will proceed as below.

* If the cursor is positioned before an editable character and the input is valid, the input will be added. The cursor will then be advanced to the next editable character in the mask.

* If the cursor is positioned before a static part of the mask, the cursor will be advanced to the next editable character.

After input has been added, the cursor will be advanced to the next editable character position.

### `backspace()` : `boolean`

Performs a backspace operation based on the current selection.

* If a text selection has been made, editable characters within the selection will be blanked out and the cursor will be placed at the start of the selection.

* If the cursor is positioned after an editable character, that character will be blanked out and the cursor will be placed before it.

* If the cursor is positioned after a static part of the mask, the cursor will be placed before it.

### `paste(input: string)`: `boolean`

Applies a string of input based on the current selection.

This behaves the same as - and is effectively like - calling `input()` for each character in the given string *with one key difference* - if any character within the input is determined to be invalid, the entire paste operation fails and the mask's value and selection are unaffected.

Pasted input may optionally contain static parts of the mask's pattern.

## `InputMask` history methods

An `InputMask` creates a new history snapshot each time you:

* Perform a different type of editing operation to the previous editing operation.
* Perform an editing operation with the cursor in a different position from where it was left after a previous editing operation.
* Perform an editing operation with a text selection.

History methods allow you to step backwards and forwards through these snapshots, updating `value` and `selection` accordingly.

If you perform an editing operation while stepping backwards through history snapshots, all snapshots after the current one will be disposed of.

A history method returns `true` if a valid history operation was performed and `value` and `selection` have been updated.

Otherwise, if an invalid history operation is attempted (e.g. trying to redo when you've already reached the point undoing started from) it will return `false`.

### `undo()` : `boolean`

Steps backwards through history snapshots.

### `redo()` : `boolean`

Steps forwards through history snapshots.

## `InputMask` public properties, getters & setters

### `emptyValue` : `string`

The value the mask will have when none of its editable data has been filled in.

### `selection` : `{start: number; end: number}`

The current selection within the input represented as an object with `start` and `end` properties, where `end >= start`.

If `start` and `end` are the same, this indicates the current cursor position in the string, otherwise it indicates a range of selected characters within the string.

`selection` will be updated as necessary by editing methods, e.g. if you `input()` a valid character, `selection` will be updated to place the cursor after the newly-inserted character.

If you're using `InputMask` as the backend for an input mask in a GUI, make sure `selection` is accurate before calling any editing methods!

### `setSelection(selection: {start: number; end: number})` : `boolean`

Sets the selection and performs an editable cursor range check if the selection change sets the cursor position (i.e. `start` and `end` are the same).

If the mask's pattern begins or ends with static characters, this method will prevent the cursor being placed prior to a leading static character or beyond a tailing static character. Only use this method to set `selection` if this is the behaviour you want.

Returns `true` if the selection needed to be adjusted as described above, `false` otherwise.

### `getValue()` : `string`

Gets the current value in the mask, which will always conform to the mask's pattern.

### `getRawValue()` : `string`

Gets the current value in the mask without non-editable pattern characters.

This can be useful when changing the mask's pattern, to "replay" the user's input so far into the new pattern:

```javascript
var mask = new InputMask({pattern: '1111 1111', value: '98781'})
mask.getValue()
// → '9878 1___'
mask.getRawValue()
// → '98781'

mask.setPattern('111 111', {value: mask.getRawValue()})
mask.getValue()
// → '987 81_'
```

### `setValue(value: string)`

Overwrites the current value in the mask.

The given value will be applied to the mask's pattern, with invalid - or missing - editable characters replaced with placeholders.

The value may optionally contain static parts of the mask's pattern.

### `setPattern(pattern: string, options: ?Object)`

Sets the mask's pattern. The mask's value and selection will also be reset by default.

#### `setPattern` options

##### `value` : `string`

A value to be applied to the new pattern - defaults to `''`.

##### `selection` : `{start: number; end: number}`

Selection after the new pattern is applied - defaults to `{start: 0, end: 0}`.

## MIT Licensed
