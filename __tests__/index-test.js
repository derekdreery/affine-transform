
const translate_vector = [10, 5.2];
const rotate_angle = Math.PI / 2;
const rotate_origin = [5, 3];
const scale_origin = [5, 3];
const scale_factor = [2, 2.5];

describe("affine-transform", () => {
    it("checks the library is present", () => {
        const lib = require("..");
        expect(lib).toBeTruthy();
    });

    it("creates a builder", () => {
        const lib = require("..");
        const builder = new lib.TransformBuilder();
        expect(builder instanceof lib.TransformBuilder).toBe(true);
        builder.translate(translate_vector);
        builder.rotate(rotate_angle, rotate_origin);
        builder.scale(scale_origin, scale_factor);
    });
});
