import invariant from "invariant";

const rotation = Symbol("rotate");
const scaling = Symbol("scale");
const translation = Symbol("translate");
const matrixOp = Symbol("matrix");

/* eslint-disable no-magic-numbers */

/**
 * Private function to compose 2 transformations
 *
 * @private
 * @param {Array} t0 An array of 6 values corresponding to affine transformation
 * @param {Array} t1 An array of 6 values corresponding to affine transformation
 * @returns {Array} An array of 6 values corresponding to affine transformation
 */
function compose2(t0, t1) {
    return [
        t0[0] * t1[0] + t0[1] * t1[3],
        t0[0] * t1[1] + t0[1] * t1[4],
        t0[0] * t1[2] + t0[1] * t1[5] + t0[2],
        t0[3] * t1[0] + t0[4] * t1[3],
        t0[3] * t1[1] + t0[4] * t1[4],
        t0[3] * t1[2] + t0[4] * t1[5] + t0[5]
    ];
}

/**
 * Private function to compose transformations
 * @returns {Array} An array of 6 values corresponding to affine transformation
 */
function compose() {
    var i;

    const compositions = arguments.length - 1;
    invariant(
        compositions > 0,
        "Must have at least 1 composition (2 transforms)"
    );
    let result = compose2(arguments[0], arguments[1]);
    for (i = 1; i < compositions; i++) {
        result = compose2(result, arguments[i + 1]);
    }
    return result;
}

/**
 * Private function to get translation transformation
 *
 * @param {Array} vec An array of 2 values corresponding to translation
 * transformation
 * @returns {Array} An array of 6 values corresponding to affine transformation
 */
function translate(vec) {
    return [1, 0, vec[0], 0, 1, vec[1]];
}

/**
 * Private function to get inverse translation transformation
 *
 * @param {Array} vec An array of 2 values corresponding to translation
 * transformation
 * @returns {Array} An array of 6 values corresponding to affine transformation
 */
function inverseTranslate(vec) {
    return [1, 0, -vec[0], 0, 1, -vec[1]];
}

/**
 * Private function to scale about origin
 *
 * @param {Array} factor An array of 2 values representing the factor to scale
 * by
 * @returns {Array} An array of 6 values corresponding to affine transformation
 */
function scale(factor) {
    return [factor[0], 0, 0, 0, factor[1], 0];
}

/**
 * A class that can operate on points, transfroming them
 */
class Transform {

    /**
     * Create a new Transform from a builder
     *
     * @param {TransformBuilder} builder The builder to use to create this
     * transform
     * @constructor
     */
    constructor(builder) {
        this.builder = builder;
        this.matrix = null;
    }

    /**
     * Convert to a Transform builder with a single matrix transform
     *
     * @returns {TransformBuilder} A TransformBuilder with a single matrix
     * transform
     */
    toBuilder() {
        const builder = new TransformBuilder(); // eslint-disable-line no-use-before-define
        builder.matrix(this.matrix);
        return builder;
    }

    /**
     * Recover the builder used to create this transform
     *
     * @returns {TransformBuilder} The builder used to make this transform
     */
    toBuilderFull() {
        return this.builder;
    }

    /**
     * Returns the inverse transform to this one
     *
     * @returns {Transform} The inverse transform to this one (bulider not
     * available)
     *
     * ```
     * (a | b | c
     *  d | e | f
     *  0 | 0 | 1)^(-1) (matrix inverse)
     *
     * =
     *
     * (e/(a e-b d) | b/(b d-a e) | (c e-b f)/(b d-a e)
     *  d/(b d-a e) | a/(a e-b d) | (c d-a f)/(a e-b d)
     *  0           | 0           | 1)
     * ```
     */
    invert() {
        const matrix = this.matrix;
        const det = 1 / (matrix[0] * matrix[4] + matrix[1] * matrix[3]);
        const transform = new Transform();
        transform.builder = null;
        transform.matrix = [
            matrix[4] * det,
            -matrix[1] * det,
            matrix[1] * matrix[5] - matrix[2] * matrix[4],
            -matrix[3] * det,
            matrix[0] * det,
            matrix[2] * matrix[3] - matrix[0] * matrix[5]
        ];
        return transform;
    }

    /**
     * Transform point by represented transformation
     *
     * @param {Array} point The point to transform
     *
     * @returns {Array} The transformed point
     */
    transform(point) {
        invariant(point.length === 2, "Point must be array of length 2");
        const matrix = this.matrix;
        return [
            matrix[0] * point[0] + matrix[1] * point[1] + matrix[2],
            matrix[3] * point[0] + matrix[4] * point[1] + matrix[5]
        ];
    }

}

/**
 * An object representing a series of affine transformations, which can be
 * squashed into a single transformation
 *
 * Think "apply this transform, then apply this transform etc."
 */
export class TransformBuilder {

    /**
     * Create an empty builder
     * @constructor
     */
    constructor() {
        this.transforms = [];
    }

    /**
     * Add a rotation
     *
     * @param {Number} angle The angle (in radians) to rotate by (clockwise)
     * @param {Point} origin The point to rotate around
     *
     * @returns {TransformBuilder} Returns itself for chaining
     */
    rotate(angle, origin) {
        this.transforms.push([rotation, [angle, origin]]);
        return this;
    }

    /**
     * Add a scaling
     *
     * @param {Array} origin The point to scale from
     * @param {mixed} factor The amount to scale by (1 is a no-op) or vector
     * to scale by [x, y]
     *
     * @returns {TransformBuilder} Returns itself for chaining
     */
    scale(origin, factor) {
        if (!Array.isArray(factor)) {
            factor = [factor, factor];
        }
        this.transforms.push([scaling, [origin, factor]]);
        return this;
    }

    /**
     * Add a scaling
     *
     * @param {Array} vector The translation to make
     * @returns {TransformBuilder} Returns itself for chaining
     */
    translate(vector) {
        invariant(vector.length === 2, "2d vector must have length 2");
        this.transforms.push([translation, [vector]]);
        return this;
    }

    /**
     * Raw matrix operation
     *
     * @param {Array} matrix The top 6 values for the affine transform
     * (row-major)
     * @return {TransformBuilder} Self for chaining
     */
    matrix(matrix) {
        invariant(matrix.length === 6, "Matrix must be of length 6 "
            + "(m11, m12, m13, m21, m22, m23)");
        this.transforms.push([matrixOp, [matrix]]);
    }

    /**
     * Compose with another builder (other builder will be applied first)
     *
     * @param {TransformBuilder} builder The builder to compose with
     * @returns {TransformBuilder} Self for chaining
     */
    applyTransform(builder) {
        invariant(builder instanceof TransformBuilder,
            "Must be a TransformBuilder");
        this.transforms = this.transforms.concat(builder.transforms);
    }

    /**
     * Get an operation from the array as a matrix (6 values)
     *
     * @param {Number} idx The position to get
     * @returns {Array} An array of 6 values corresponding to the
     * transformation matrix for the selected operation
     */
    asMatrix(idx) {
        invariant(
            idx >= 0 && idx < this.transforms.length,
            "Array index out of bounds for fetching transformation"
        );
        const transform = this.transforms[idx];
        if (transform[0] === rotation) {
            return compose();
        } else if (transform[0] === scaling) {
            const [origin, factor] = transform[1];
            return compose(
                inverseTranslate(origin),
                scale(factor),
                translate(origin)
            );
        } else if (transform[0] === translation) {
            const vec = transform[1];
            return translate(vec);
        } else if (transform[0] === matrixOp) {
            return transform[1];
        }
        throw new Error("Unrecognised transformation");
    }

    /**
     * Create the related Transform object
     * @returns {Transform} The transform object
     */
    build() {
        return new Transform(this);
    }
}
