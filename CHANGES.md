## 1.1.0 / 2015-03-25

Added the ability to escape special pattern characters with a leading backslash
character. As a result, backslashes must also be escaped to be used as static
parts of a mask's pattern.

Added a `mask.emptyValue` property for convenient comparison.

## 1.0.0 / 2015-03-25

Initial realease features:

* Fixed-width masking pattern
* Editable character placeholders:
  * `1` - number
  * `A` - letter
  * `*` - alphanumeric
* Editing operations which are aware of cursor position/selection and update
  post-op cursor position:
  * Single character input
  * Pasting a string
  * Backspacing
