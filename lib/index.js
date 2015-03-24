'use strict';

var assign = require('object-assign')

var PLACEHOLDER = '_'

var DIGIT = '#'

function isFormatCharacter(char) {
  return char === DIGIT
}

function isValidCharacter(char, format) {
  if (format == DIGIT) { return /^\d$/.test(char) }
  throw new Error('Unknown format character: ' + format)
}

/**
 * @param {Array.<string>} value
 * @param {Array.<string>} pattern
 * @return {Array.<string>}
 */
function formatValueToPattern(value, pattern) {
  var valueBuffer = new Array(pattern.length)
  var valueIndex = 0
  for (var i = 0, l = pattern.length; i < l ; i++) {
    if (isFormatCharacter(pattern[i])) {
      valueBuffer[i] = value.length > valueIndex && isValidCharacter(value[valueIndex], pattern[i])
                       ? value[valueIndex]
                       : PLACEHOLDER
      valueIndex++
    }
    else {
      valueBuffer[i] = pattern[i]
      // Also allow the value to contain static values from the pattern by
      // advancing its index.
      if (value.length > valueIndex && value[valueIndex] === pattern[i]) {
        valueIndex++
      }
    }
  }
  return valueBuffer
}

function InputMask(options) {
  if (!(this instanceof InputMask)) { return new InputMask(options) }

  options = assign({
    pattern: null,
    selection: {start: 0, end: 0},
    value: ''
  }, options)

  if (options.pattern == null) {
    throw new Error('InputMask: you must provide a pattern.')
  }

  this.setPattern(options.pattern, options.value)
  this.setSelection(options.selection)
}

/**
 * Applies a single character of input based on the current selection.
 * @param {string} input a single character of input.
 * @return {boolean} true if a change has been made to value or selection as a
 *   result of the input, false otherwise.
 */
InputMask.prototype.input = function input(input) {
  // Ignore additional input if the cursor's at the end of the pattern
  if (this.selection.start === this.selection.end &&
      this.selection.start === this.pattern.length) {
    return false
  }

  var inputIndex = this.selection.start

  // If a range of characters was selected and it includes the first editable
  // character, make sure any input given is applied to it.
  if (this.selection.start !== this.selection.end &&
      this.selection.start < this._firstEditableIndex &&
      this.selection.end > this._firstEditableIndex) {
    inputIndex = this._firstEditableIndex
  }

  var format = this.pattern[inputIndex]

  // Bail out or add the character to input
  if (isFormatCharacter(format)) {
    if (!isValidCharacter(input, format)) {
      return false
    }
    this.value[inputIndex] = input
  }
  else {
    // The user must have placed the cursor prior to, or began a selection with,
    // a static part of the pattern, so skip over it.
    this.value[inputIndex] = format
  }

  // If multiple characters were selected, blank the remainder out based on the
  // pattern.
  var end = this.selection.end - 1
  while (end > inputIndex) {
    format = this.pattern[end]
    this.value[end] = isFormatCharacter(format) ? PLACEHOLDER : format
    end--
  }

  // Advance the cursor to the next character
  this.selection.start = this.selection.end = inputIndex + 1

  // Skip over any subsequent static characters
  while (this.pattern.length > this.selection.start &&
         !isFormatCharacter(this.pattern[this.selection.start])) {
    this.value[this.selection.start] = this.pattern[this.selection.start]
    this.selection.start++
    this.selection.end++
  }

  return true
}

/**
 * Attempts to delete from the value based on the current cursor position or
 * selection.
 * @return {boolean} true if the value or selection changed as the result of
 *   backspacing, false otherwise.
 */
InputMask.prototype.backspace = function backspace() {
  // If the cursor is at the start there's nothing to do
  if (this.selection.start === 0 && this.selection.end === 0) {
    return false
  }

  var format

  // No range selected - work on the character preceding the cursor
  if (this.selection.start === this.selection.end) {
    format = this.pattern[this.selection.start - 1]
    this.value[this.selection.start - 1] = isFormatCharacter(format) ? PLACEHOLDER : format
    this.selection.start--
    this.selection.end--
  }
  // Range selected - delete characters and leave the cursor at the start of the selection
  else {
    var end = this.selection.end - 1
    while (end >= this.selection.start) {
      format = this.pattern[end]
      this.value[end] = isFormatCharacter(format) ? PLACEHOLDER : format
      end--
    }
    this.selection.end = this.selection.start
  }

  return true
}

/**
 * Attempts to paste input at the current cursor position or over the top of the
 * current selection.
 * Invalid content at any position will cause the paste to be rejected, and it
 * may contain static parts of the mask's pattern.
 * @param {string} input
 * @return {boolean} true if the paste was successful, false otherwise.
 */
InputMask.prototype.paste = function paste(input) {
  var initialValue = this.value.slice()
  var initialSelection = assign({}, this.selection)
  for (var i = 0, l = input.length; i < l; i++) {
    var valid = this.input(input.charAt(i))
    // Allow static parts of the pattern to appear in pasted input
    if (!valid) {
      if (this.selection.start > 0) {
        var format = this.pattern[this.selection.start - 1]
        if (!isFormatCharacter(format) && input.charAt(i) === format) {
          continue
        }
      }
      this.value = initialValue
      this.selection = initialSelection
      return false
    }
  }
  return true
}

InputMask.prototype.setPattern = function setPattern(pattern, value) {
  var patternChars = pattern.split('')
  var firstEditableIndex = null
  var lastEditableIndex = null
  for (var i = 0, l = patternChars.length; i < l; i++) {
    if (isFormatCharacter(patternChars[i])) {
      if (firstEditableIndex === null) {
        firstEditableIndex = i
      }
      lastEditableIndex = i
    }
  }
  if (firstEditableIndex === null && lastEditableIndex === null) {
    throw new Error(
      'InputMask: pattern "' + pattern + '" does not contain any editable characters.'
    )
  }
  this.pattern = patternChars
  this._firstEditableIndex = firstEditableIndex
  this._lastEditableIndex = lastEditableIndex
  this.setValue(value || '')
}

InputMask.prototype.setSelection = function setSelection(selection) {
  this.selection = assign({}, selection)
  if (this.selection.start === this.selection.end) {
    if (this.selection.start < this._firstEditableIndex) {
      this.selection.start = this.selection.end = this._firstEditableIndex
      return true
    }
    if (this.selection.end > this._lastEditableIndex + 1) {
      this.selection.start = this.selection.end = this._lastEditableIndex + 1
      return true
    }
  }
  return false
}

InputMask.prototype.getValue = function getValue() {
  return this.value.join('')
}

InputMask.prototype.setValue = function setValue(value) {
  this.value = formatValueToPattern(value.split(''), this.pattern)
}

InputMask.formatValueToPattern = formatValueToPattern

module.exports = InputMask