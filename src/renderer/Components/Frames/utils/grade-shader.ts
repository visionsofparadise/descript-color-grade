// GLSL source for Descript's current color pipeline.
//
// The `FRAGMENT_SOURCE` below is a direct copy of the
// `ColorAdjustment` + `ColorAdjustment_adjustLighting` functions
// extracted from Descript's renderer bundle at
// `%LocalAppData%\Descript\Partitions\descript2\Cache\Cache_Data\f_09e4ea`
// (webpack chunk pushed from https://web.descript.com/static), wrapped
// in a WebGL1 `main()` that samples `uSource`, runs the effect, and
// writes `gl_FragColor`. The wrapping boilerplate is ours; everything
// between `vec4 ColorAdjustment_adjustLighting(...)` and the closing
// brace of `vec4 ColorAdjustment(...)` is Descript's code unmodified,
// including the non-normalized `vec3(0.3, 0.3, 0.3)` luminance weights
// and the magic constants 0.76 / 0.8. The `WhiteBalance(...)` function
// is likewise copied verbatim from the current bundle so upgraded
// projects can route temperature/tint through the same pre-stage.

export const VERTEX_SOURCE = `
attribute vec2 aPosition;
varying vec2 vTexCoord;

void main() {
  vTexCoord = vec2((aPosition.x + 1.0) * 0.5, (aPosition.y + 1.0) * 0.5);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const FRAGMENT_SOURCE = `
precision highp float;

uniform sampler2D uSource;
uniform mat4 uColorMatrix;
uniform vec4 uColorVector;
uniform vec4 uColorOffset;
uniform float uHighlights;
uniform float uShadows;
uniform float uWhiteBalanceEnabled;
uniform float uWhiteBalanceTemperature;
uniform float uWhiteBalanceTint;
uniform vec3 uWhiteBalanceFilter;

varying vec2 vTexCoord;

// ----- begin verbatim Descript source -----

vec4 WhiteBalance(vec4 source, float temperature, float tint, vec3 whiteBalanceFilter) {
  vec3 warmFilter = whiteBalanceFilter;
  mat3 RGBtoYIQ = mat3(
    0.299, 0.587, 0.114,
    0.596, -0.274, -0.322,
    0.212, -0.523, 0.311
  );
  mat3 YIQtoRGB = mat3(
    1.0, 0.956, 0.621,
    1.0, -0.272, -0.647,
    1.0, -1.105, 1.702
  );

  vec3 yiq = RGBtoYIQ * source.rgb;
  yiq.b = clamp(yiq.b + tint * 0.5226 * 0.1, -0.5226, 0.5226);
  vec3 rgb = YIQtoRGB * yiq;

  vec3 processed = vec3(
    (rgb.r < 0.5 ? (2.0 * rgb.r * warmFilter.r) : (1.0 - 2.0 * (1.0 - rgb.r) * (1.0 - warmFilter.r))),
    (rgb.g < 0.5 ? (2.0 * rgb.g * warmFilter.g) : (1.0 - 2.0 * (1.0 - rgb.g) * (1.0 - warmFilter.g))),
    (rgb.b < 0.5 ? (2.0 * rgb.b * warmFilter.b) : (1.0 - 2.0 * (1.0 - rgb.b) * (1.0 - warmFilter.b)))
  );
  vec3 color = mix(rgb, processed, temperature);
  return vec4(color, source.a);
}

vec4 ColorAdjustment_adjustLighting(vec4 source, float highlights, float shadows)
{
  if (highlights == 1.0 && shadows == 1.0) {
    return source;
  }

  const mediump vec3 luminanceWeighting = vec3(0.3, 0.3, 0.3);
  mediump float luminance = dot(source.rgb, luminanceWeighting);

  //(shadows+1.0) changed to just shadows:
  mediump float shadow = clamp((pow(luminance, 1.0/shadows) + (-0.76)*pow(luminance, 2.0/shadows)) - luminance, 0.0, 1.0);
  mediump float highlight = clamp((1.0 - (pow(1.0-luminance, 1.0/(2.0-highlights)) + (-0.8)*pow(1.0-luminance, 2.0/(2.0-highlights)))) - luminance, -1.0, 0.0);
  lowp vec3 result = vec3(0.0, 0.0, 0.0) + ((luminance + shadow + highlight) - 0.0) * ((source.rgb - vec3(0.0, 0.0, 0.0))/(luminance - 0.0));

  // blend toward white if highlights is more than 1
  mediump float contrastedLuminance = ((luminance - 0.5) * 1.5) + 0.5;
  mediump float whiteInterp = contrastedLuminance*contrastedLuminance*contrastedLuminance;
  mediump float whiteTarget = clamp(highlights, 1.0, 2.0) - 1.0;
  result = mix(result, vec3(1.0), whiteInterp*whiteTarget);

  // blend toward black if shadows is less than 1
  mediump float invContrastedLuminance = 1.0 - contrastedLuminance;
  mediump float blackInterp = invContrastedLuminance*invContrastedLuminance*invContrastedLuminance;
  mediump float blackTarget = 1.0 - clamp(shadows, 0.0, 1.0);
  result = mix(result, vec3(0.0), blackInterp*blackTarget);

  return vec4(result, source.a);
}

vec4 ColorAdjustment(vec4 source, mat4 colorMatrix, vec4 colorVector, vec4 colorOffset, float highlights, float shadows) {
  vec4 color = source;
  color *= colorVector;
  color *= colorMatrix;
  color += colorOffset;
  color = clamp(color, 0.0, 1.0);
  return ColorAdjustment_adjustLighting(color, highlights, shadows);
}

// ----- end verbatim Descript source -----

void main() {
  vec4 source = texture2D(uSource, vTexCoord);

  if (uWhiteBalanceEnabled > 0.5) {
    source = WhiteBalance(
      source,
      uWhiteBalanceTemperature,
      uWhiteBalanceTint,
      uWhiteBalanceFilter
    );
  }

  gl_FragColor = ColorAdjustment(
    source,
    uColorMatrix,
    uColorVector,
    uColorOffset,
    uHighlights,
    uShadows
  );
}
`;
