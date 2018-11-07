'use strict'

import { factory } from '../../utils/factory'
import { createAlgorithm01 } from '../../type/matrix/utils/algorithm01'
import { createAlgorithm02 } from '../../type/matrix/utils/algorithm02'
import { createAlgorithm06 } from '../../type/matrix/utils/algorithm06'
import { createAlgorithm11 } from '../../type/matrix/utils/algorithm11'
import { createAlgorithm13 } from '../../type/matrix/utils/algorithm13'
import { createAlgorithm14 } from '../../type/matrix/utils/algorithm14'

const name = 'nthRoot'
const dependencies = [
  'typed',
  'matrix',
  'equalScalar',
  'type.BigNumber',
  'type.DenseMatrix',
  'type.SparseMatrix'
]

export const createNthRoot = factory(name, dependencies, ({ typed, matrix, equalScalar, type: { BigNumber } }) => {
  const algorithm01 = createAlgorithm01({ typed })
  const algorithm02 = createAlgorithm02({ typed, equalScalar })
  const algorithm06 = createAlgorithm06({ typed, equalScalar })
  const algorithm11 = createAlgorithm11({ typed, equalScalar })
  const algorithm13 = createAlgorithm13({ typed })
  const algorithm14 = createAlgorithm14({ typed })

  /**
   * Calculate the nth root of a value.
   * The principal nth root of a positive real number A, is the positive real
   * solution of the equation
   *
   *     x^root = A
   *
   * For matrices, the function is evaluated element wise.
   *
   * Syntax:
   *
   *     math.nthRoot(a)
   *     math.nthRoot(a, root)
   *
   * Examples:
   *
   *     math.nthRoot(9, 2)    // returns 3, as 3^2 == 9
   *     math.sqrt(9)          // returns 3, as 3^2 == 9
   *     math.nthRoot(64, 3)   // returns 4, as 4^3 == 64
   *
   * See also:
   *
   *     sqrt, pow
   *
   * @param {number | BigNumber | Array | Matrix | Complex} a
   *              Value for which to calculate the nth root
   * @param {number | BigNumber} [root=2]    The root.
   * @return {number | Complex | Array | Matrix} Returns the nth root of `a`
   */
  const complexErr = ('' +
    'Complex number not supported in function nthRoot. ' +
    'Use nthRoots instead.'
  )
  const nthRoot = typed(name, {

    'number': function (x) {
      return _nthRoot(x, 2)
    },
    'number, number': _nthRoot,

    'BigNumber': function (x) {
      return _bigNthRoot(x, new BigNumber(2))
    },
    'Complex': function (x) {
      throw new Error(complexErr)
    },
    'Complex, number': function (x, y) {
      throw new Error(complexErr)
    },
    'BigNumber, BigNumber': _bigNthRoot,

    'Array | Matrix': function (x) {
      return nthRoot(x, 2)
    },

    'SparseMatrix, SparseMatrix': function (x, y) {
      // density must be one (no zeros in matrix)
      if (y.density() === 1) {
        // sparse + sparse
        return algorithm06(x, y, nthRoot)
      } else {
        // throw exception
        throw new Error('Root must be non-zero')
      }
    },

    'SparseMatrix, DenseMatrix': function (x, y) {
      return algorithm02(y, x, nthRoot, true)
    },

    'DenseMatrix, SparseMatrix': function (x, y) {
      // density must be one (no zeros in matrix)
      if (y.density() === 1) {
        // dense + sparse
        return algorithm01(x, y, nthRoot, false)
      } else {
        // throw exception
        throw new Error('Root must be non-zero')
      }
    },

    'DenseMatrix, DenseMatrix': function (x, y) {
      return algorithm13(x, y, nthRoot)
    },

    'Array, Array': function (x, y) {
      // use matrix implementation
      return nthRoot(matrix(x), matrix(y)).valueOf()
    },

    'Array, Matrix': function (x, y) {
      // use matrix implementation
      return nthRoot(matrix(x), y)
    },

    'Matrix, Array': function (x, y) {
      // use matrix implementation
      return nthRoot(x, matrix(y))
    },

    'SparseMatrix, number | BigNumber': function (x, y) {
      return algorithm11(x, y, nthRoot, false)
    },

    'DenseMatrix, number | BigNumber': function (x, y) {
      return algorithm14(x, y, nthRoot, false)
    },

    'number | BigNumber, SparseMatrix': function (x, y) {
      // density must be one (no zeros in matrix)
      if (y.density() === 1) {
        // sparse - scalar
        return algorithm11(y, x, nthRoot, true)
      } else {
        // throw exception
        throw new Error('Root must be non-zero')
      }
    },

    'number | BigNumber, DenseMatrix': function (x, y) {
      return algorithm14(y, x, nthRoot, true)
    },

    'Array, number | BigNumber': function (x, y) {
      // use matrix implementation
      return nthRoot(matrix(x), y).valueOf()
    },

    'number | BigNumber, Array': function (x, y) {
      // use matrix implementation
      return nthRoot(x, matrix(y)).valueOf()
    }
  })

  nthRoot.toTex = { 2: `\\sqrt[\${args[1]}]{\${args[0]}}` }

  return nthRoot

  /**
   * Calculate the nth root of a for BigNumbers, solve x^root == a
   * http://rosettacode.org/wiki/Nth_root#JavaScript
   * @param {BigNumber} a
   * @param {BigNumber} root
   * @private
   */
  function _bigNthRoot (a, root) {
    const precision = BigNumber.precision
    const Big = BigNumber.clone({ precision: precision + 2 })
    const zero = new BigNumber(0)

    const one = new Big(1)
    const inv = root.isNegative()
    if (inv) {
      root = root.neg()
    }

    if (root.isZero()) {
      throw new Error('Root must be non-zero')
    }
    if (a.isNegative() && !root.abs().mod(2).equals(1)) {
      throw new Error('Root must be odd when a is negative.')
    }

    // edge cases zero and infinity
    if (a.isZero()) {
      return inv ? new Big(Infinity) : 0
    }
    if (!a.isFinite()) {
      return inv ? zero : a
    }

    let x = a.abs().pow(one.div(root))
    // If a < 0, we require that root is an odd integer,
    // so (-1) ^ (1/root) = -1
    x = a.isNeg() ? x.neg() : x
    return new BigNumber((inv ? one.div(x) : x).toPrecision(precision))
  }
})

/**
 * Calculate the nth root of a, solve x^root == a
 * http://rosettacode.org/wiki/Nth_root#JavaScript
 * @param {number} a
 * @param {number} root
 * @private
 */
function _nthRoot (a, root) {
  const inv = root < 0
  if (inv) {
    root = -root
  }

  if (root === 0) {
    throw new Error('Root must be non-zero')
  }
  if (a < 0 && (Math.abs(root) % 2 !== 1)) {
    throw new Error('Root must be odd when a is negative.')
  }

  // edge cases zero and infinity
  if (a === 0) {
    return inv ? Infinity : 0
  }
  if (!isFinite(a)) {
    return inv ? 0 : a
  }

  let x = Math.pow(Math.abs(a), 1 / root)
  // If a < 0, we require that root is an odd integer,
  // so (-1) ^ (1/root) = -1
  x = a < 0 ? -x : x
  return inv ? 1 / x : x

  // Very nice algorithm, but fails with nthRoot(-2, 3).
  // Newton's method has some well-known problems at times:
  // https://en.wikipedia.org/wiki/Newton%27s_method#Failure_analysis
  /*
  let x = 1 // Initial guess
  let xPrev = 1
  let i = 0
  const iMax = 10000
  do {
    const delta = (a / Math.pow(x, root - 1) - x) / root
    xPrev = x
    x = x + delta
    i++
  }
  while (xPrev !== x && i < iMax)

  if (xPrev !== x) {
    throw new Error('Function nthRoot failed to converge')
  }

  return inv ? 1 / x : x
  */
}