'use strict'

function extend(dest, src) {
  if (src) {
    var props = Object.keys(src)
    for (var i = 0, l = props.length; i < l; i++) {
      dest[props[i]] = src[props[i]]
    }
  }
  return dest
}

function copy(obj) {
  return extend({}, obj)
}

/**
 * Merge an object defining format characters into the defaults.
 * Passing null/undefined for en existing format character removes it.
 * Passing a definition for an existing format character overrides it.
 * @param {?Object} formatCharacters.
 */
function mergeFormatCharacters(formatCharacters) {
  var merged = copy(DEFAULT_FORMAT_CHARACTERS)
  if (formatCharacters) {
    var chars = Object.keys(formatCharacters)
    for (var i = 0, l = chars.length; i < l; i++) {
      var char = chars[i]
      if (formatCharacters[char] == null) {
        delete merged[char]
      }
      else {
        merged[char] = formatCharacters[char]
      }
    }
  }
  return merged
}

var ESCAPE_CHAR = '\\'
var OPTIONAL_CHAR = '?'
var STATIC_CHAR = 'static'
var EDITABLE_CHAR = 'editable'

var DIGIT_RE = /^\d$/
var LETTER_RE = /^[A-Za-z]$/
var ALPHANNUMERIC_RE = /^[\dA-Za-z]$/

var DEFAULT_PLACEHOLDER_CHAR = '_'
var DEFAULT_FORMAT_CHARACTERS = {
  '*': {
    validate: function(char) { return ALPHANNUMERIC_RE.test(char) }
  },
  '1': {
    validate: function(char) { return DIGIT_RE.test(char) }
  },
  'a': {
    validate: function(char) { return LETTER_RE.test(char) }
  },
  'A': {
    validate: function(char) { return LETTER_RE.test(char) },
    transform: function(char) { return char.toUpperCase() }
  },
  '#': {
    validate: function(char) { return ALPHANNUMERIC_RE.test(char) },
    transform: function(char) { return char.toUpperCase() }
  }
}

/**
 * @param {string} source
 * @patam {?Object} formatCharacters
 */
function Pattern(source, formatCharacters, placeholderChar, isRevealingMask) {
  if (!(this instanceof Pattern)) {
    return new Pattern(source, formatCharacters, placeholderChar)
  }

  /** Placeholder character */
  this.placeholderChar = placeholderChar || DEFAULT_PLACEHOLDER_CHAR
  /** Format character definitions. */
  this.formatCharacters = formatCharacters || DEFAULT_FORMAT_CHARACTERS
  /** Pattern definition string with escape characters. */
  this.source = source
  /** Pattern characters after escape characters have been processed. */
  this.pattern = []
  /** Length of the pattern after escape characters have been processed. */
  this.length = 0
  /** Index of the first editable character. */
  this.firstEditableIndex = null
  /** Index of the last editable character. */
  this.lastEditableIndex = null
  /** If true, only the pattern before the last valid value character shows. */
  this.isRevealingMask = isRevealingMask || false

  this._parse()
}

Pattern.prototype._parse = function parse() {
  var sourceChars = this.source.split('')
  var patternIndex = 0
  var pattern = []

  for (var i = 0, l = sourceChars.length; i < l; i++) {
    var char = sourceChars[i]
    var type = STATIC_CHAR

    if (char === ESCAPE_CHAR) {
      if (i === l - 1) {
        throw new Error('InputMask: pattern ends with a raw ' + ESCAPE_CHAR)
      }
      char = sourceChars[++i]
    }
    else if (char === OPTIONAL_CHAR) {
      pattern[patternIndex - 1].optional = true
      continue
    }
    else if (char in this.formatCharacters) {
      if (this.firstEditableIndex === null) {
        this.firstEditableIndex = patternIndex
      }
      this.lastEditableIndex = patternIndex
      type = EDITABLE_CHAR
    }

    pattern.push({
      char: char,
      type: type,
      index: patternIndex,
      optional: false
    })
    patternIndex++
  }

  if (this.firstEditableIndex === null) {
    throw new Error(
      'InputMask: pattern "' + this.source + '" does not contain any editable characters.'
    )
  }

  this.pattern = pattern
  this.length = pattern.length
}

/**
 * @param {Array<string>} value
 * @return {Array<string>}
 */
Pattern.prototype.formatValue = function format(value) {
  var valueBuffer = []
  var valueIndex = 0

  var optionals = {}

  if (this.isRevealingMask && value.length === 0) {
    return valueBuffer
  }

  for (var i = 0, l = this.length; i < l; i++) {
    var char = value[valueIndex] || null

    if (this.isOptionalIndex(i) && !optionals[i]) {
      optionals[i] = {
        valueIndex: valueIndex,
        patternIndex: i,
        pending: true
      }

      valueBuffer[i] = null
      valueIndex--
    }
    else if (!!value[valueIndex + 1] &&
        i === this.lastEditableIndex &&
        pendingOptionals().length > 0) {
      var optional = nextPendingOptional()

      valueBuffer = valueBuffer.slice(0, optional.patternIndex)
      valueIndex = optional.valueIndex - 1
      i = optional.patternIndex - 1

      optional.pending = false
    }
    else if (this.isEditableIndex(i)) {
      if (this.isRevealingMask &&
          !this.isValidAtIndex(char, i)) {
        break
      }
      valueBuffer[i] = (char !== null && this.isValidAtIndex(char, i)
                        ? this.transform(char, i)
                        : this.placeholderChar)
    }
    else {
      valueBuffer[i] = this.pattern[i].char
      // Also allow the value to contain static values from the pattern by
      // advancing its index.
      if (char === null || char !== this.pattern[i].char) {
        valueIndex--
      }
    }

    if (this.isRevealingMask &&
      !value[valueIndex + 1] &&
      i < this.lastEditableIndex) {
      break
    }

    valueIndex++
  }

  return valueBuffer

  function pendingOptionals() {
    return Object.keys(optionals).filter(function(index) {
      return optionals[index].pending === true
    })
  }

  function nextPendingOptional() {
    var lastIndex = Math.max.apply(null, pendingOptionals())

    return optionals[lastIndex]
  }
}

/**
 * @param {number} index
 * @return {boolean}
 */
Pattern.prototype.isEditableIndex = function isEditableIndex(index) {
  if (!this.pattern[index]) {
    return false
  }

  return this.pattern[index].type === EDITABLE_CHAR
}

/**
 * @param {number} index
 * @return {boolean}
 */
Pattern.prototype.isOptionalIndex = function isOptionalIndex(index) {
  if (!this.pattern[index]) {
    return false
  }

  return this.pattern[index].optional
}

/**
 * @param {string} char
 * @param {number} index
 * @return {boolean}
 */
Pattern.prototype.isValidAtIndex = function isValidAtIndex(char, index) {
  if (this.pattern[index].type == EDITABLE_CHAR) {
    return this.formatCharacters[this.pattern[index].char].validate(char)
  }

  return this.pattern[index].char === char
}

Pattern.prototype.transform = function transform(char, index) {
  if (this.pattern[index].type == EDITABLE_CHAR) {
    var format = this.formatCharacters[this.pattern[index].char]
    return typeof format.transform == 'function' ? format.transform(char) : char
  }

  return char
}

Pattern.prototype.charAt = function charAt(index) {
  return this.pattern[index].char
}

function InputMask(options) {
  if (!(this instanceof InputMask)) { return new InputMask(options) }
  options = extend({
    formatCharacters: null,
    pattern: null,
    isRevealingMask: false,
    placeholderChar: DEFAULT_PLACEHOLDER_CHAR,
    selection: {start: 0, end: 0},
    value: ''
  }, options)

  if (options.pattern == null) {
    throw new Error('InputMask: you must provide a pattern.')
  }

  if (typeof options.placeholderChar !== 'string' || options.placeholderChar.length > 1) {
    throw new Error('InputMask: placeholderChar should be a single character or an empty string.')
  }

  this.placeholderChar = options.placeholderChar
  this.formatCharacters = mergeFormatCharacters(options.formatCharacters)
  this.setPattern(options.pattern, {
    value: options.value,
    selection: options.selection,
    isRevealingMask: options.isRevealingMask
  })
}

// Editing

/**
 * Applies a single character of input based on the current selection.
 * @param {string} char
 * @return {boolean} true if a change has been made to value or selection as a
 *   result of the input, false otherwise.
 */
InputMask.prototype.input = function input(char) {
  // Ignore additional input if the cursor's at the end of the pattern
  if (this.selection.start === this.selection.end &&
      (this.selection.start === this.pattern.length ||
      this.selection.start > this.pattern.lastEditableIndex)) {
    var pendingOptional = this.pendingOptional()

    if (pendingOptional === -1) {
      return false
    }

    this._fillOptional()
    this.selection.start--
    this.selection.end--
  }

  var selectionBefore = copy(this.selection)
  var valueBefore = this.getValue()

  var inputIndex = this.selection.start

  // Find next editable index
  var nextEditableIndex = inputIndex
  while (!this.pattern.isEditableIndex(nextEditableIndex) || this.pattern.isOptionalIndex(nextEditableIndex)) {
    if (!this.pattern.isEditableIndex(nextEditableIndex) &&
      this.pattern.isValidAtIndex(char, nextEditableIndex)) {
      break
    }
    if (nextEditableIndex > this.pattern.lastEditableIndex) {
      return false
    }
    nextEditableIndex++
  }

  if (!this.pattern.isValidAtIndex(char, nextEditableIndex)) {
    return false
  }

  // Add statics until next editable
  while (inputIndex < nextEditableIndex) {
    if (this.pattern.isOptionalIndex(inputIndex)) {
      this.value[inputIndex].value = null
    }
    else {
      this.value[inputIndex].value = this.pattern.charAt(inputIndex)
    }
    inputIndex++
  }

  this.value[inputIndex].value = this.pattern.transform(char, inputIndex)

  // If this is the last editable index fill with the rest
  if (inputIndex === this.pattern.lastEditableIndex &&
      this.pendingOptional() === -1) {
    var index = inputIndex
    while (index < this.pattern.length - 1) {
      this.value[++index].value = this.pattern.charAt(index)
    }
  }

  // If multiple characters were selected, blank the remainder out based on the
  // pattern.
  if (inputIndex + 1 < this.selection.end) {
    this.remove(inputIndex + 1, this.selection.end - 1)
  }

  // Advance the cursor to the next character
  this.selection.start = this.selection.end = inputIndex + 1

  // History
  if (this._historyIndex != null) {
    // Took more input after undoing, so blow any subsequent history away
    this._history.splice(this._historyIndex, this._history.length - this._historyIndex)
    this._historyIndex = null
  }
  if (this._lastOp !== 'input' ||
      selectionBefore.start !== selectionBefore.end ||
      this._lastSelection !== null && selectionBefore.start !== this._lastSelection.start) {
    this._history.push({value: valueBefore, selection: selectionBefore, lastOp: this._lastOp})
  }
  this._lastOp = 'input'
  this._lastSelection = copy(this.selection)

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

  var selectionBefore = copy(this.selection)
  var valueBefore = this.getValue()

  // No range selected
  if (this.selection.start === this.selection.end) {
    var previousEditableIndex = this.selection.start - 1

    while (!this.pattern.isEditableIndex(previousEditableIndex)) {
      if (previousEditableIndex === 0) {
        break
      }
      previousEditableIndex--
    }

    this.remove(previousEditableIndex, this.selection.end)
    this.selection.start = previousEditableIndex
  }
  else {
    this.remove(this.selection.start, this.selection.end - 1)
  }

  this.selection.end = this.selection.start

  // History
  if (this._historyIndex != null) {
    // Took more input after undoing, so blow any subsequent history away
    this._history.splice(this._historyIndex, this._history.length - this._historyIndex)
  }
  if (this._lastOp !== 'backspace' ||
      selectionBefore.start !== selectionBefore.end ||
      this._lastSelection !== null && selectionBefore.start !== this._lastSelection.start) {
    this._history.push({value: valueBefore, selection: selectionBefore, lastOp: this._lastOp})
  }
  this._lastOp = 'backspace'
  this._lastSelection = copy(this.selection)

  return true
}

/**
 * Attempts to paste a string of input at the current cursor position or over
 * the top of the current selection.
 * Invalid content at any position will cause the paste to be rejected, and it
 * may contain static parts of the mask's pattern.
 * @param {string} input
 * @return {boolean} true if the paste was successful, false otherwise.
 */
InputMask.prototype.paste = function paste(input) {
  // This is necessary because we're just calling input() with each character
  // and rolling back if any were invalid, rather than checking up-front.
  var initialState = {
    value: this.value.slice(),
    selection: copy(this.selection),
    _lastOp: this._lastOp,
    _history: this._history.slice(),
    _historyIndex: this._historyIndex,
    _lastSelection: copy(this._lastSelection)
  }

  // If there are static characters at the start of the pattern and the cursor
  // or selection is within them, the static characters must match for a valid
  // paste.
  if (this.selection.start < this.pattern.firstEditableIndex) {
    for (var i = 0, l = this.pattern.firstEditableIndex - this.selection.start; i < l; i++) {
      if (input.charAt(i) !== this.pattern.charAt(i)) {
        return false
      }
    }

    // Continue as if the selection and input started from the editable part of
    // the pattern.
    input = input.substring(this.pattern.firstEditableIndex - this.selection.start)
    this.selection.start = this.pattern.firstEditableIndex
  }

  for (i = 0, l = input.length;
       i < l && this.selection.start <= this.pattern.lastEditableIndex;
       i++) {
    var valid = this.input(input.charAt(i))
    // Allow static parts of the pattern to appear in pasted input - they will
    // already have been stepped over by input(), so verify that the value
    // deemed invalid by input() was the expected static character.
    if (!valid) {
      if (this.selection.start > 0) {
        // XXX This only allows for one static character to be skipped
        var patternIndex = this.selection.start
        if (!this.pattern.isEditableIndex(patternIndex) &&
            input.charAt(i) === this.pattern.charAt(patternIndex)) {
          continue
        }
      }
      extend(this, initialState)
      return false
    }
  }

  return true
}

InputMask.prototype.remove = function remove(start, end) {
  if (this.pattern.isRevealingMask) {
    for (var i = start; i < end; i++) {
      this.value[i].value = null
    }

    var indexInput = start
    for (i = end; i < this.value.length; i++) {
      if (!this.pattern.isEditableIndex(indexInput)) {
        this.value[indexInput].value = this.pattern.charAt(indexInput)
        indexInput++
      }

      if (this.pattern.isEditableIndex(i) &&
          this.pattern.isValidAtIndex(this.value[i].value, indexInput)) {
        this.value[indexInput].value = this.value[i].value

        indexInput++
      }

      this.value[i].value = null
    }
  }
  else {
    while (end >= start) {
      if (this.pattern.isEditableIndex(end)) {
        this.value[end].value = this.placeholderChar
      }
      end--
    }
  }
}

// History

InputMask.prototype.undo = function undo() {
  // If there is no history, or nothing more on the history stack, we can't undo
  if (this._history.length === 0 || this._historyIndex === 0) {
    return false
  }

  var historyItem
  if (this._historyIndex == null) {
    // Not currently undoing, set up the initial history index
    this._historyIndex = this._history.length - 1
    historyItem = this._history[this._historyIndex]
    // Add a new history entry if anything has changed since the last one, so we
    // can redo back to the initial state we started undoing from.
    var value = this.getValue()
    if (historyItem.value !== value ||
        historyItem.selection.start !== this.selection.start ||
        historyItem.selection.end !== this.selection.end) {
      this._history.push({value: value, selection: copy(this.selection), lastOp: this._lastOp, startUndo: true})
    }
  }
  else {
    historyItem = this._history[--this._historyIndex]
  }

  this.setValue(historyItem.value)
  this.selection = historyItem.selection
  this._lastOp = historyItem.lastOp
  return true
}

InputMask.prototype.redo = function redo() {
  if (this._history.length === 0 || this._historyIndex == null) {
    return false
  }
  var historyItem = this._history[++this._historyIndex]
  // If this is the last history item, we're done redoing
  if (this._historyIndex === this._history.length - 1) {
    this._historyIndex = null
    // If the last history item was only added to start undoing, remove it
    if (historyItem.startUndo) {
      this._history.pop()
    }
  }
  this.setValue(historyItem.value)
  this.selection = historyItem.selection
  this._lastOp = historyItem.lastOp
  return true
}

// Getters & setters

InputMask.prototype.setPattern = function setPattern(pattern, options) {
  options = extend({
    selection: {start: 0, end: 0},
    value: ''
  }, options)
  this.pattern = new Pattern(pattern, this.formatCharacters, this.placeholderChar, options.isRevealingMask)
  this.value = this.pattern.pattern.slice()
  this.setValue(options.value)
  this.emptyValue = this.pattern.formatValue([]).join('')
  this.selection = options.selection
  this._resetHistory()
}

InputMask.prototype.setSelection = function setSelection(selection) {
  this.selection = copy(selection)
  if (this.selection.start === this.selection.end) {
    if (this.selection.start < this.pattern.firstEditableIndex) {
      this.selection.start = this.selection.end = this.pattern.firstEditableIndex
      return true
    }
    // Set selection to the first editable, non-placeholder character before the selection
    // OR to the beginning of the pattern
    var index = this.selection.start
    while (index >= this.pattern.firstEditableIndex) {
      if (this.pattern.isEditableIndex(index - 1) &&
          this.value[index - 1].value !== this.placeholderChar ||
          index === this.pattern.firstEditableIndex) {
        this.selection.start = this.selection.end = index
        break
      }
      index--
    }
    return true
  }
  return false
}

InputMask.prototype.setValue = function setValue(value) {
  if (value == null) {
    value = ''
  }

  var formatedValue = this.pattern.formatValue(value.split(''))

  this.value = this.value.map(function(pattern, index) {
    pattern.value = formatedValue[index] || null
    return pattern
  })
}

InputMask.prototype.getValue = function getValue() {
  return this.value.map(function(pattern) {
    return pattern.value
  }).join('')
}

InputMask.prototype.getRawValue = function getRawValue() {
  var rawValue = []
  for (var i = 0; i < this.value.length; i++) {
    if (this.pattern.isEditableIndex(i) === true) {
      rawValue.push(this.value[i].value)
    }
  }
  return rawValue.join('')
}

InputMask.prototype.pendingOptional = function pendingOptional() {
  var pendings = this.value.filter(function(pattern) {
    return pattern.optional && pattern.value == null
  }).map(function(pattern) {
    return pattern.index
  })

  if (pendings.length === 0) {
    return -1
  }

  return Math.max.apply(null, pendings)
}

InputMask.prototype._fillOptional = function _fillOptional() {
  var pendingIndex = this.pendingOptional()

  var indexInput = pendingIndex
  for (var i = pendingIndex + 1; i < this.value.length; i++) {
    if (!this.pattern.isEditableIndex(indexInput)) {
      this.value[indexInput].value = this.pattern.charAt(indexInput)
      indexInput++
    }

    if (this.pattern.isEditableIndex(i) &&
        this.pattern.isValidAtIndex(this.value[i].value, indexInput)) {
      this.value[indexInput].value = this.value[i].value

      indexInput++
    }

    this.value[i].value = null
  }
}

InputMask.prototype._resetHistory = function _resetHistory() {
  this._history = []
  this._historyIndex = null
  this._lastOp = null
  this._lastSelection = copy(this.selection)
}

InputMask.Pattern = Pattern

module.exports = InputMask
