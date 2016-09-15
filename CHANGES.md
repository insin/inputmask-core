## 2.2.0 / 2016-09-15

Fixed placeholderChar to allow `''`
Fixed `setSelection` to set the selection to the end of the prior value chunk (user-input value)
Added `isRevealingMask` property

## 2.1.1 / 2015-09-11

Fixed setting`null` or `undefined` as the mask's value - this will now be treated as if `''` had been set rather than causing an error ([#5](https://github.com/insin/inputmask-core/issues/5))

## 2.1.0 / 2015-07-15

Added `mask.getRawValue()` to get the user's raw input, without any non-editable placeholder characters. [[muffinresearch][muffinresearch]]

Added customisation of the character used to fill in editable slots for which these is no input yet, by passing a single-character `placeholderChar` string as an option to the `InputMask` constructor. [[muffinresearch][muffinresearch]]

## 2.0.1 / 2015-07-14

Fixed taking input for patterns with leading static parts when the cursor or entire selection is in the static part. [[jordansexton][jordansexton]]

## 2.0.0 / 2015-04-03

Added `mask.undo()` and `mask.redo()`

`setPattern()` now sets/resets the `selection`.

### Breaking changes

`setPattern()` now takes an options `Object` for its second argument instead of a
`String` for the new value. `value` and `selection` options may be given.

The given (or defaulted) `selection` object is now used as-is when setting
initial selection. It used to be set via `setSelection()`, which moved it to
the first editable index.

## 1.2.0 / 2015-03-26

Added customisation of format characters by passing a `formatCharacters` object
as an option to the `InputMask` constructor.

Added the ability for format character definitions to transform valid input.

Changed letter format character to `a`

Added new format characters:
* `A` - letter, which will be transformed to upper case
* `#` - alphanumeric, which will be transformed to upper case

## 1.1.0 / 2015-03-25

Added the ability to escape special pattern characters with a leading backslash
character. As a result, backslashes must also be escaped to be used as static
parts of a mask's pattern.

Added a `mask.emptyValue` property for convenient comparison.

## 1.0.0 / 2015-03-25

Initial release features:

* Fixed-width masking pattern
* Format characters:
  * `1` - number
  * `A` - letter
  * `*` - alphanumeric
* Editing operations which are aware of cursor position/selection and update
  post-op cursor position:
  * Single character input
  * Pasting a string
  * Backspacing

[jordansexton]: https://github.com/jordansexton
[muffinresearch]: https://github.com/muffinresearch
