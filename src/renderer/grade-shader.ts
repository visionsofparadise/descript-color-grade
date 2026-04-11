// GLSL source for Descript's `com.descript.colorAdjustments` effect.
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
// and the magic constants 0.76 / 0.8.

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

varying vec2 vTexCoord;

// ----- begin verbatim Descript source -----

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
