'use strict';

var test = require('tape')

var InputMask = require('../lib')

test('formatValueToPattern', function(t) {
  t.plan(7)

  function formatValueToPattern(value, pattern) {
    return InputMask.formatValueToPattern(value.split(''), pattern.split('')).join('')
  }

  t.equal(formatValueToPattern('', '## ##'), '__ __', 'Empty value gets all placeholders')
  t.equal(formatValueToPattern('1', '## ##'), '1_ __', 'Partial value 1')
  t.equal(formatValueToPattern('12', '## ##'), '12 __', 'Partial value 2')
  t.equal(formatValueToPattern('123', '## ##'), '12 3_', 'Partial value 3')
  t.equal(formatValueToPattern('1234', '## ##'), '12 34', 'Complete value (values only)')
  t.equal(formatValueToPattern('12 34', '## ##'), '12 34', 'Complete value (with format characters)')

  t.equal(formatValueToPattern('', '##/##/####'), '__/__/____', 'Empty value gets all placeholders')
})

test('Basic input', function(t) {
  t.plan(23)

  var mask = new InputMask({
    pattern: '#### #### #### ####'
  })
  t.equal(mask.getValue(), '____ ____ ____ ____', 'Initial mask value is blank')
  t.notOk(mask.input('a'), 'Invalid input ignored')
  t.ok(mask.input('1'), 'Valid input accepted')
  t.ok(mask.input('2'), 'Valid input accepted')
  t.ok(mask.input('3'), 'Valid input accepted')
  t.ok(mask.input('4'), 'Valid input accepted')
  t.deepEqual(mask.selection, {start: 5, end: 5}, 'Skipped over blank')
  t.ok(mask.input('1'), 'Valid input accepted')
  t.ok(mask.input('2'), 'Valid input accepted')
  t.ok(mask.input('3'), 'Valid input accepted')
  t.ok(mask.input('4'), 'Valid input accepted')
  t.deepEqual(mask.selection, {start: 10, end: 10}, 'Skipped over blank')
  t.ok(mask.input('1'), 'Valid input accepted')
  t.ok(mask.input('2'), 'Valid input accepted')
  t.ok(mask.input('3'), 'Valid input accepted')
  t.ok(mask.input('4'), 'Valid input accepted')
  t.deepEqual(mask.selection, {start: 15, end: 15}, 'Skipped over blank')
  t.ok(mask.input('1'), 'Valid input accepted')
  t.ok(mask.input('2'), 'Valid input accepted')
  t.ok(mask.input('3'), 'Valid input accepted')
  t.ok(mask.input('4'), 'Valid input accepted')
  t.notOk(mask.input('1'), 'Input ignored when cursor is at the end of the pattern')
  t.equal(mask.getValue(), '1234 1234 1234 1234', 'Final value')
})

test('Input with selected range', function(t) {
  t.plan(9)

  var mask = new InputMask({
    pattern: '#### #### #### ####',
    value: '1234123412341234'
  })
  t.equal(mask.getValue(), '1234 1234 1234 1234', 'Initial mask value is formatted')
  mask.selection = {start: 5, end: 9}
  t.ok(mask.input('9'), 'Valid input accepted')
  t.equal(mask.getValue(), '1234 9___ 1234 1234', 'Other selected characters are blanked out')
  t.deepEqual(mask.selection, {start: 6, end: 6}, 'Curspr placed after first character in selection')
  t.ok(mask.input('8'), 'Valid input accepted')
  t.ok(mask.input('7'), 'Valid input accepted')
  t.ok(mask.input('6'), 'Valid input accepted')
  t.deepEqual(mask.selection, {start: 10, end: 10}, 'Skipped over blank')
  t.equal(mask.getValue(), '1234 9876 1234 1234', 'Final value')
})

test('Skipping multiple static characters', function(t) {
  t.plan(3)

  var mask = new InputMask({
    pattern: '#La-li-lu-le-lo#'
  })
  t.ok(mask.input('1'), 'Valid input accepted')
  t.ok(mask.input('2'), 'Valid input accepted')
  t.equal(mask.getValue(), '1La-li-lu-le-lo2', 'Final value')
})

test('Basic backspacing', function(t) {
  t.plan(24)

  var mask = new InputMask({
    pattern: '#### #### #### ####',
    value: '1234123412341234'
  })
  t.notOk(mask.backspace(), 'Backspace with cursor at start of input is ignored')
  mask.selection = {start: 19, end: 19}
  t.ok(mask.backspace(), 'Valid backspace accepted')
  t.ok(mask.backspace(), 'Valid backspace accepted')
  t.ok(mask.backspace(), 'Valid backspace accepted')
  t.ok(mask.backspace(), 'Valid backspace accepted')
  // Backspacking doesn't automatically skip characters, as we can't tell when
  // the user intends to start making input again, so it just steps over static
  // parts of the mask when you backspace with the cursor ahead of them.
  t.ok(mask.backspace(), 'Skipped over blank')
  t.ok(mask.backspace(), 'Valid backspace accepted')
  t.ok(mask.backspace(), 'Valid backspace accepted')
  t.ok(mask.backspace(), 'Valid backspace accepted')
  t.ok(mask.backspace(), 'Valid backspace accepted')
  t.equal(mask.getValue(), '1234 1234 ____ ____', 'Intermediate value')
  t.deepEqual(mask.selection, {start: 10, end: 10}, 'Cursor remains in front of last deleted character')
  t.ok(mask.backspace(), 'Skipped over blank')
  t.ok(mask.backspace(), 'Valid backspace accepted')
  t.ok(mask.backspace(), 'Valid backspace accepted')
  t.ok(mask.backspace(), 'Valid backspace accepted')
  t.ok(mask.backspace(), 'Valid backspace accepted')
  t.ok(mask.backspace(), 'Skipped over blank')
  t.ok(mask.backspace(), 'Valid backspace accepted')
  t.ok(mask.backspace(), 'Valid backspace accepted')
  t.ok(mask.backspace(), 'Valid backspace accepted')
  t.ok(mask.backspace(), 'Valid backspace accepted')
  t.equal(mask.getValue(), '____ ____ ____ ____', 'Final value')
  t.deepEqual(mask.selection, {start: 0, end: 0}, 'Cursor ended up at the start of input')
})

test('Backspace with selected range', function(t) {
  t.plan(4)

  var mask = new InputMask({
    pattern: '#### #### #### ####',
    value: '1234123412341234'
  })
  t.equal(mask.getValue(), '1234 1234 1234 1234', 'Initial mask value is formatted')
  mask.selection = {start: 5, end: 9}
  t.ok(mask.backspace(), 'Valid backspace accepted')
  t.equal(mask.getValue(), '1234 ____ 1234 1234', 'Other selected characters are blanked out')
  t.deepEqual(mask.selection, {start: 5, end: 5}, 'Cursor placed before first character in selection')
})

test('Pasting', function(t) {
  t.plan(9)

  var mask = new InputMask({
    pattern: '#### #### #### ####'
  })

  // Invalid characters at any position will cause a paste to be rejected
  t.notOk(mask.paste('1234123A12341234'), 'Invalid input rejected')

  // A paste larger than the available remaining space will be rejected
  t.notOk(mask.paste('12341234123412349'), 'Too large input rejected')

  // Pasted input doesn't have to contain static formatting characters...
  t.ok(mask.paste('1234123412341234'), 'Complete, valid input accepted')
  t.equal(mask.getValue(), '1234 1234 1234 1234', 'Formatted pasted value')
  t.deepEqual(mask.selection, {start: 19, end: 19}, 'Cursor position after paste')

  mask.selection = {start: 0, end: 19}
  t.ok(mask.backspace(), 'Backspace to delete content')
  t.equal(mask.getValue(), '____ ____ ____ ____', 'Empty after backspace')

  // Pasted input can contain static formatting characters
  t.ok(mask.paste('1234 1234 1234 1234'), 'Pasted value can contain static parts')
  t.equal(mask.getValue(), '1234 1234 1234 1234', 'Value after paste')
})
