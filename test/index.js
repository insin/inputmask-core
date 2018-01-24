/* eslint-disable no-new */
'use strict'

var test = require('tape')

var InputMask = require('../lib')

test('README example', function(t) {
  var mask = new InputMask({pattern: '11/11/1111'})
  t.false(mask.input('a'), 'Invalid input is rejected')
  t.true(mask.input('1'), 'Valid input is accepted')
  t.equal(mask.getValue(), '1_/__/____')
  t.deepEqual(mask.selection, {start: 1, end: 1}, 'Editing operations update the cursor position')
  t.true(mask.paste('2345678'), 'Pasting is supported')
  t.equal(mask.getValue(), '12/34/5678')
  t.true(mask.backspace(), 'Backspacing is supported')
  t.equal(mask.getValue(), '12/34/567_')
  mask.selection = {start: 0, end: 9}
  t.true(mask.backspace(), 'Editing operations also know how to deal with selected ranges')
  t.equal(mask.getValue(), '__/__/____')
  t.true(mask.undo(), 'Undo is supported')
  t.equal(mask.getValue(), '12/34/567_')
  t.deepEqual(mask.selection, {start: 0, end: 9})
  t.true(mask.redo(), 'Redo is supported')
  t.equal(mask.getValue(), '__/__/____')
  t.deepEqual(mask.selection, {start: 0, end: 0})
  t.end()
})

test('formatValueToPattern', function(t) {
  t.plan(7)

  function formatValueToPattern(value, pattern) {
    return new InputMask.Pattern(pattern).formatValue(value.split('')).join('')
  }

  t.equal(formatValueToPattern('', '11 11'), '__ __', 'Empty value gets all placeholders')
  t.equal(formatValueToPattern('1', '11 11'), '1_ __', 'Partial value 1')
  t.equal(formatValueToPattern('12', '11 11'), '12 __', 'Partial value 2')
  t.equal(formatValueToPattern('123', '11 11'), '12 3_', 'Partial value 3')
  t.equal(formatValueToPattern('1234', '11 11'), '12 34', 'Complete value (values only)')
  t.equal(formatValueToPattern('12 34', '11 11'), '12 34', 'Complete value (with format characters)')

  t.equal(formatValueToPattern('', '11/11/1111'), '__/__/____', 'Empty value gets all placeholders')
})

test('Constructor options', function(t) {
  t.plan(24)

  t.throws(function() { new InputMask() },
           /InputMask: you must provide a pattern./,
           'Pattern is required')
  t.throws(function() { new InputMask({pattern: '------'}) },
           /InputMask: pattern "------" does not contain any editable characters./,
           'Patterns must contain editable characters')

  var mask = new InputMask({pattern: '1111 1111 1111 1111'})
  t.equal(mask.pattern.firstEditableIndex, 0, 'Full range first editable index ')
  t.equal(mask.pattern.lastEditableIndex, 18, 'Full range last editable index calculation')

  mask = new InputMask({pattern: '---111---'})
  t.equal(mask.pattern.firstEditableIndex, 3, 'Partial range first editable index calculation')
  t.equal(mask.pattern.lastEditableIndex, 5, 'Partial range last editable index calculation')
  t.deepEqual(mask.selection, {start: 0, end: 0}, 'Default selection is set as-is')

  mask = new InputMask({pattern: '-1-1-1-', value: '987'})
  t.equal(mask.getValue(), '-9-8-7-', 'Initial value is formatted')
  t.equal(mask.emptyValue, '-_-_-_-', 'emptyValue checks out')

  mask.setPattern('--11--', {value: '99'})
  t.equal(mask.getValue(), '--99--', 'New pattern value is set')
  t.equal(mask.emptyValue, '--__--', 'emptyValue is updated after setPattern')

  // Custom placeholder char can be provided.
  mask = new InputMask({pattern: '--11--', value: '98', placeholderChar: ' '})
  t.equal(mask.getValue(), '--98--', 'Initial value is formatted as expected')
  t.equal(mask.emptyValue, '--  --', 'emptyValue checks out with custom placeholderChar')

  mask = new InputMask({pattern: '--11--', value: '98', placeholderChar: '#'})
  t.equal(mask.emptyValue, '--##--', 'emptyValue with updated placeholderChar')
  t.equal(mask.getValue(), '--98--',
          'Initial value is formatted with another different placeholderChar')

  mask = new InputMask({pattern: '1111 1111', value: '98781'})
  t.equal(mask.getValue(), '9878 1___', 'Intial value is correct')
  mask.setPattern('111 111', {value: mask.getRawValue()})
  t.equal(mask.getValue(), '987 81_', 'Mask is updated with no spaces')
  mask.setPattern('11 11', {value: mask.getRawValue()})
  t.equal(mask.getValue(), '98 78', 'Value is truncated to fit')

  // Custom format characters can be configured per-mask
  mask = new InputMask({
    pattern: 'lll1*',
    value: 'ABC+',
    formatCharacters: {
      // Passing null for an existing format character disables it
      '1': null,
      // Passing an existing format character overrides it
      '*': {
        validate: function(char) { return /[+-/*]/.test(char) }
      },
      // Define a new format character which lowercases letter input
      'l': {
        validate: function(char) { return /^[A-Za-z]$/.test(char) },
        transform: function(char) { return char.toLowerCase() }
      }
    }
  })
  t.equal(mask.getValue(), 'abc1+', 'Custom formatting charactes are used')

  // Value can be null or undefined
  mask = new InputMask({pattern: '111 111', value: null})
  t.equal(mask.getValue(), '___ ___', 'null value treated as blank')
  mask = new InputMask({pattern: '111 111', value: undefined})
  t.equal(mask.getValue(), '___ ___', 'undefined value treated as blank')

  // Mask is progressive
  mask = new InputMask({pattern: '111-1111 x 111', value: '47', isRevealingMask: true})
  t.equal(mask.getValue(), '47', 'no mask characters or placeholders are revealed')
  mask = new InputMask({pattern: '111-1111 x 111', value: '476', isRevealingMask: true})
  t.equal(mask.getValue(), '476-', 'mask is revealed up to the next editable character')
  mask = new InputMask({pattern: '111-1111 x 111', value: '47 3191', isRevealingMask: true})
  t.equal(mask.getValue(), '47_-3191 x ', 'mask is revealed up to the last value')
})

test('Formatting characters', function(t) {
  t.plan(1)
  var mask = new InputMask({pattern: '1a**A#', value: '9f9fzz'})
  t.equal(mask.getValue(), '9f9fZZ', 'All values, no placeholders')
})

test('Escaping placeholder characters', function(t) {
  t.plan(3)

  t.throws(function() { new InputMask({pattern: '\\1\\A\\*\\*'}) },
           /InputMask: pattern "\\1\\A\\\*\\\*" does not contain any editable characters./,
           'Escaped placeholders treated as static characters')
  t.throws(function() { new InputMask({pattern: 'A1*\\'}) },
           /InputMask: pattern ends with a raw \\/,
           'A pattern must not end with an escape character')
  var mask = new InputMask({pattern: '\\\\\\1:1,\\A:A,\\*:*\\\\', value: '9Zg'})
  t.equal(mask.getValue(), '\\1:9,A:Z,*:g\\', 'Escape character can be escaped')
})

test('Basic input', function(t) {
  t.plan(23)

  var mask = new InputMask({
    pattern: '1111 1111 1111 1111'
  })
  t.equal(mask.getValue(), '____ ____ ____ ____', 'Initial mask value is blank')
  t.false(mask.input('a'), 'Invalid input ignored')

  // Input is provided to the mask one character at a time
  t.true(mask.input('1'), 'Valid input accepted')
  t.true(mask.input('2'), 'Valid input accepted')
  t.true(mask.input('3'), 'Valid input accepted')
  t.true(mask.input('4'), 'Valid input accepted')
  t.deepEqual(mask.selection, {start: 5, end: 5}, 'Skipped over blank')
  t.true(mask.input('1'), 'Valid input accepted')
  t.true(mask.input('2'), 'Valid input accepted')
  t.true(mask.input('3'), 'Valid input accepted')
  t.true(mask.input('4'), 'Valid input accepted')
  t.deepEqual(mask.selection, {start: 10, end: 10}, 'Skipped over blank')
  t.true(mask.input('1'), 'Valid input accepted')
  t.true(mask.input('2'), 'Valid input accepted')
  t.true(mask.input('3'), 'Valid input accepted')
  t.true(mask.input('4'), 'Valid input accepted')
  t.deepEqual(mask.selection, {start: 15, end: 15}, 'Skipped over blank')
  t.true(mask.input('1'), 'Valid input accepted')
  t.true(mask.input('2'), 'Valid input accepted')
  t.true(mask.input('3'), 'Valid input accepted')
  t.true(mask.input('4'), 'Valid input accepted')
  t.false(mask.input('1'), 'Input ignored when cursor is at the end of the pattern')
  t.equal(mask.getValue(), '1234 1234 1234 1234', 'Final value')
})

test('Revealing input', function(t) {
  t.plan(8)
  var mask = new InputMask({pattern: '111-1111 x 111', isRevealingMask: true})
  mask.input('4')
  mask.input('6')
  t.equal(mask.getValue(), '46', 'no mask characters or placeholders are revealed')
  mask.input('7')
  t.equal(mask.getValue(), '467-', 'mask is revealed up to the next editable character')
  mask.input(' ')
  t.equal(mask.getValue(), '467-', 'mask rejects invalid characters')
  mask.input('3')
  mask.input('1')
  mask.input('9')
  mask.input('1')
  t.equal(mask.getValue(), '467-3191 x ', 'mask is revealed up to the last value')
  mask.backspace()
  mask.backspace()
  mask.backspace()
  t.equal(mask.getValue(), '467-3191 x ', 'mask is still revealed up to the last value')
  mask.backspace()
  mask.backspace()
  mask.backspace()
  t.equal(mask.getValue(), '467-3', 'mask is hidden by backspace')
  mask.input('1')
  t.equal(mask.getValue(), '467-31', 'can insert after backspace')
  mask.input('9')
  mask.input('1')
  t.equal(mask.getValue(), '467-3191 x ', 'mask is still revealed up to the last value after backspace')
  //t.equal(mask.getValue(), '467-', 'backspace jumps non-editable characters')
})

test('Input with selected range', function(t) {
  t.plan(11)

  var mask = new InputMask({
    pattern: '1111 1111 1111 1111',
    value: '1234123412341234'
  })
  t.equal(mask.getValue(), '1234 1234 1234 1234', 'Initial mask value is formatted')

  // If you have text selected, input will set the first selected character and
  // clear the rest.
  mask.selection = {start: 6, end: 8}
  t.true(mask.input('9'), 'Valid input accepted')
  t.equal(mask.getValue(), '1234 19_4 1234 1234', 'Other selected characters are blanked out')
  t.deepEqual(mask.selection, {start: 7, end: 7}, 'Curspr placed after first character in selection')
  t.true(mask.input('8'), 'Valid input accepted')
  t.equal(mask.getValue(), '1234 1984 1234 1234', 'Final value')

  // Static parts of the pattern will be respected even if they're part of a
  // selection being cleared when input is given.
  mask.selection = {start: 6, end: 12}
  t.true(mask.input('2'), 'Valid input accepted')
  t.equal(mask.getValue(), '1234 12__ __34 1234', 'Only blanks out input positions')

  // If a range of characters are selected and the first character was contained
  // in the range, any input given should apply to it.
  mask = new InputMask({pattern: '----- 1111 1111'})
  mask.selection = {start: 0, end: 15}
  t.true(mask.input('2'), 'Valid input accepted')
  t.equal(mask.getValue(), '----- 2___ ____', 'Value was applied to the first editable character')
  t.deepEqual(mask.selection, {start: 7, end: 7}, 'Cursor was placed after first editable character')
})

test('Leading static characters', function(t) {
  t.plan(2)

  // Input should be applied to the first editable character if the cursor or
  // selection start is prior to it.
  var mask = new InputMask({
    pattern: '(0) 111 111'
  })
  t.true(mask.input('5'), 'Valid input accepted')
  t.equal(mask.getValue(), '(0) 5__ ___')
})

test('Providing a custom placeholder character', function(t) {
  t.plan(5)

  var mask = new InputMask({pattern: '---- 1111', placeholderChar: ' '})
  mask.selection = {start: 0, end: 15}
  t.true(mask.input('3'), 'Valid input accepted with custom placeholderChar')
  t.equal(mask.getValue(), '---- 3   ',
          'Value applied to the first editable char with custom placeholderChar')
  t.throws(function() { new InputMask({pattern: '--11', placeholderChar: '__'}) },
           /InputMask: placeholderChar should be a single character or an empty string./,
           'placholderChar length > 1 is invalid')

  // With an empty string as the placeholderChar
  mask = new InputMask({pattern: '---- 1111', placeholderChar: ''})
  mask.selection = {start: 0, end: 15}
  t.true(mask.input('3'), 'Valid input accepted with empty string placeholderChar')
  t.equal(mask.getValue(), '---- 3',
          'Value applied to the first editable char with empty string placeholderChar')
  t.end()
})

test('Skipping multiple static characters', function(t) {
  t.plan(3)

  // When taking input, the cursor will jump to the next available character
  // which takes input, regardless of how many subsequent static pattern parts
  // there are.
  var mask = new InputMask({
    pattern: '1----1'
  })
  t.true(mask.input('1'), 'Valid input accepted')
  t.true(mask.input('2'), 'Valid input accepted')
  t.equal(mask.getValue(), '1----2', 'Final value')
})

test('Basic backspacing', function(t) {
  t.plan(24)

  var mask = new InputMask({
    pattern: '1111 1111 1111 1111',
    value: '1234123412341234'
  })
  t.false(mask.backspace(), 'Backspace with cursor at start of input is ignored')
  mask.selection = {start: 19, end: 19}
  t.true(mask.backspace(), 'Valid backspace accepted')
  t.true(mask.backspace(), 'Valid backspace accepted')
  t.true(mask.backspace(), 'Valid backspace accepted')
  t.true(mask.backspace(), 'Valid backspace accepted')
  // Backspacking doesn't automatically skip characters, as we can't tell when
  // the user intends to start making input again, so it just steps over static
  // parts of the mask when you backspace with the cursor ahead of them.
  t.true(mask.backspace(), 'Skipped over blank')
  t.true(mask.backspace(), 'Valid backspace accepted')
  t.true(mask.backspace(), 'Valid backspace accepted')
  t.true(mask.backspace(), 'Valid backspace accepted')
  t.true(mask.backspace(), 'Valid backspace accepted')
  t.equal(mask.getValue(), '1234 1234 ____ ____', 'Intermediate value')
  t.deepEqual(mask.selection, {start: 10, end: 10}, 'Cursor remains in front of last deleted character')
  t.true(mask.backspace(), 'Skipped over blank')
  t.true(mask.backspace(), 'Valid backspace accepted')
  t.true(mask.backspace(), 'Valid backspace accepted')
  t.true(mask.backspace(), 'Valid backspace accepted')
  t.true(mask.backspace(), 'Valid backspace accepted')
  t.true(mask.backspace(), 'Skipped over blank')
  t.true(mask.backspace(), 'Valid backspace accepted')
  t.true(mask.backspace(), 'Valid backspace accepted')
  t.true(mask.backspace(), 'Valid backspace accepted')
  t.true(mask.backspace(), 'Valid backspace accepted')
  t.equal(mask.getValue(), '____ ____ ____ ____', 'Final value')
  t.deepEqual(mask.selection, {start: 0, end: 0}, 'Cursor ended up at the start of input')
})

test('Backspace with selected range', function(t) {
  t.plan(4)

  var mask = new InputMask({
    pattern: '1111 1111 1111 1111',
    value: '1234123412341234'
  })
  t.equal(mask.getValue(), '1234 1234 1234 1234', 'Initial mask value is formatted')
  mask.selection = {start: 6, end: 8}
  t.true(mask.backspace(), 'Valid backspace accepted')
  t.equal(mask.getValue(), '1234 1__4 1234 1234', 'Other selected characters are blanked out')
  t.deepEqual(mask.selection, {start: 6, end: 6}, 'Cursor placed before first character in selection')
})

test('Pasting', function(t) {
  t.plan(10)

  var mask = new InputMask({
    pattern: '1111 1111 1111 1111'
  })

  // Invalid characters at any position will cause a paste to be rejected
  t.false(mask.paste('1234123A12341234'), 'Invalid input rejected')

  // A paste larger than the available remaining space will not be rejected if
  // input was valid up to the end of the editable portion of the mask.
  t.true(mask.paste('12341234123412349'), 'Too large input not rejected')
  t.equal(mask.getValue(), '1234 1234 1234 1234')

  // Pasted input doesn't have to contain static formatting characters...
  mask.setValue('')
  mask.selection = {start: 0, end: 0}
  t.true(mask.paste('1234123412341234'), 'Complete, valid input accepted')
  t.equal(mask.getValue(), '1234 1234 1234 1234', 'Formatted pasted value')
  t.deepEqual(mask.selection, {start: 19, end: 19}, 'Cursor position after paste')

  mask.selection = {start: 0, end: 19}
  t.true(mask.backspace(), 'Backspace to delete content')
  t.equal(mask.getValue(), '____ ____ ____ ____', 'Empty after backspace')

  // Pasted input can contain static formatting characters
  t.true(mask.paste('1234 1234 1234 1234'), 'Pasted value can contain static parts')
  t.equal(mask.getValue(), '1234 1234 1234 1234', 'Value after paste')
})

test('Pasting with leading static pattern in selection', function(t) {
  t.plan(7)

  var mask = new InputMask({
    pattern: '----- 1111 1111'
  })

  // Pasting with cursor in leading static part
  mask.selection = {start: 0, end: 0}
  t.false(mask.paste('1234 5678'), 'Paste fails if leading static pattern not matched')
  t.ok(mask.paste('----- 1234 5678'), 'Paste succeeds when leading static pattern is matched')
  t.equal(mask.getValue(), '----- 1234 5678')

  // Pasting with selection including leading static part
  mask.setValue('')
  t.equal(mask.getValue(), '----- ____ ____')
  mask.selection = {start: 0, end: 15}
  t.false(mask.paste('1'), 'Paste fails if leading static pattern not matched')
  t.ok(mask.paste('----- 1'), 'Paste succeeds when leading static pattern is matched')
  t.equal(mask.getValue(), '----- 1___ ____')
})

test('Setting selection', function(t) {
  t.plan(16)

  var mask = new InputMask({pattern: '----- [[11 1111 ]]-'})
  t.equal(mask.pattern.firstEditableIndex, 8, 'First editable index calculation')
  t.equal(mask.pattern.lastEditableIndex, 14, 'Last editable index calculation')
  // The cursor cannot be placed before the first editable index...
  t.true(mask.setSelection({start: 0, end: 0}), 'Cursor before editable region is changed')
  t.deepEqual(mask.selection, {start: 8, end: 8}, 'Cursor placed at first editable character')
  // ...or beyond the last editable character
  t.true(mask.setSelection({start: 18, end: 18}), 'Cursor after editable region is changed')
  t.deepEqual(mask.selection, {start: 8, end: 8}, 'Cursor placed after last editable character')
  // ...however a selection can span beyond the editable region
  t.false(mask.setSelection({start: 0, end: 19}), 'Selection beyond editable region not changed')
  t.deepEqual(mask.selection, {start: 0, end: 19}, 'Whole value can be selected')

  mask = new InputMask({pattern: '----- [[11 1111 ]]-', value: '23  45'})
  // Setting the selection before the first editable index moves selection to first editable index
  t.true(mask.setSelection({start: 0, end: 0}), 'Cursor before editable region, regardless of value, is changed')
  t.deepEqual(mask.selection, {start: 8, end: 8}, 'Cursor placed at first editable character, regardless of value')
  // Setting the selection within the value works as expected
  t.true(mask.setSelection({start: 9, end: 9}), 'Cursor within value is not changed')
  t.deepEqual(mask.selection, {start: 9, end: 9}, 'Cursor stays within value')
  // Setting the selection after the last editable index moves selection to the next editable index after the last value
  t.true(mask.setSelection({start: 18, end: 18}), 'Cursor after editable region is changed, regardless of value')
  t.deepEqual(mask.selection, {start: 14, end: 14}, 'Cursor placed at first editable character after last value')
  // Setting the selection after (but not within) a value moves selection to the next editable index after the previous value
  t.true(mask.setSelection({start: 11, end: 11}), 'Cursor after editable region with values both before and after it is changed')
  t.deepEqual(mask.selection, {start: 10, end: 10}, 'Cursor placed at first editable character after prior value')
})

test('History', function(t) {
  t.plan(31)

  var mask = new InputMask({pattern: 'aaa***'})

  t.false(mask.undo(), 'invalid undo - nothing to undo')

  t.true(mask.input('a'), 'valid input')
  t.true(mask.input('b'), 'valid input')
  t.true(mask.input('c'), 'valid input')
  t.true(mask.input('d'), 'valid input')
  t.true(mask.input('e'), 'valid input')
  t.true(mask.input('f'), 'valid input')

  t.deepEqual(mask._history, [{value: '______', selection: {start: 0, end: 0}, lastOp: null}])

  t.true(mask.backspace(), 'valid input')
  t.true(mask.backspace(), 'valid input')
  t.true(mask.backspace(), 'valid input')

  t.deepEqual(mask._history, [
    {value: '______', selection: {start: 0, end: 0}, lastOp: null},
    {value: 'abcdef', selection: {start: 6, end: 6}, lastOp: 'input'}
  ])

  t.true(mask.input('1'), 'valid input')
  t.true(mask.input('2'), 'valid input')
  t.true(mask.input('3'), 'valid input')

  t.deepEqual(mask._history, [
    {value: '______', selection: {start: 0, end: 0}, lastOp: null},
    {value: 'abcdef', selection: {start: 6, end: 6}, lastOp: 'input'},
    {value: 'abc___', selection: {start: 3, end: 3}, lastOp: 'backspace'}
  ])

  t.true(mask.undo(), 'valid undo')

  // A new history entry will be added if the current value differs from the
  // last value in history. This is flagged so we can remove it later if we redo
  // back to the same point.
  t.deepEqual(mask._history, [
    {value: '______', selection: {start: 0, end: 0}, lastOp: null},
    {value: 'abcdef', selection: {start: 6, end: 6}, lastOp: 'input'},
    {value: 'abc___', selection: {start: 3, end: 3}, lastOp: 'backspace'},
    {value: 'abc123', selection: {start: 6, end: 6}, lastOp: 'input', startUndo: true}
  ], 'initial undo adds change since last history value to history items')

  t.deepEqual([mask.getValue(), mask.selection], ['abc___', {start: 3, end: 3}])
  t.true(mask.undo(), 'valid undo')
  t.deepEqual([mask.getValue(), mask.selection], ['abcdef', {start: 6, end: 6}])
  t.true(mask.undo(), 'valid undo')
  t.deepEqual([mask.getValue(), mask.selection], ['______', {start: 0, end: 0}])
  t.false(mask.undo(), 'invalid undo - nothing more to undo')

  t.true(mask.redo(), 'valid redo')
  t.deepEqual([mask.getValue(), mask.selection], ['abcdef', {start: 6, end: 6}])
  t.true(mask.redo(), 'valid redo')
  t.deepEqual([mask.getValue(), mask.selection], ['abc___', {start: 3, end: 3}])
  t.true(mask.redo(), 'valid redo')
  t.deepEqual([mask.getValue(), mask.selection], ['abc123', {start: 6, end: 6}])
  t.false(mask.redo(), 'invalid redo - nothing more to redo')
})
