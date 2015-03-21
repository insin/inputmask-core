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
