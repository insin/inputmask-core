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
    throw new Error('InputMask: you must provide a pattern')
  }

  this.pattern = options.pattern.split('')
  this.selection = options.selection
  this.value = formatValueToPattern(options.value.split(''), this.pattern)
}

/**
 * Applies a single character of input based on the current selection.
 * @param {string} input a single character of input.
 * @return {boolean} true if a change has been made to value or selection as a
 *    result of the input, false otherwise.
 */
InputMask.prototype.input = function input(input) {
  var format = this.pattern[this.selection.start]

  // Bail out or add the character to input
  if (isFormatCharacter(format)) {
    if (!isValidCharacter(input, format)) {
      return false
    }
    this.value[this.selection.start] = input
  }
  else {
    // The user must have placed the cursor prior to, or began a selection with,
    // a static part of the pattern, so skip over it.
    this.value[this.selection.start] = format
  }

  // If multiple chatacters were selected, blank the remainder out based on the
  // pattern.
  while (this.selection.end > this.selection.start) {
    format = this.pattern[this.selection.end]
    this.value[this.selection.end] = isFormatCharacter(format) ? PLACEHOLDER : format
    this.selection.end--
  }

  // Advance the cursor to the next character
  this.selection.start++
  this.selection.end++

  // Skip over any subsequent static characters
  while (this.pattern.length > this.selection.start &&
         !isFormatCharacter(this.pattern[this.selection.start])) {
    this.value[this.selection.start] = this.pattern[this.selection.start]
    this.selection.start++
    this.selection.end++
  }

  return true
}

InputMask.prototype.getValue = function getValue() {
  return this.value.join('')
}

InputMask.formatValueToPattern = formatValueToPattern

module.exports = InputMask