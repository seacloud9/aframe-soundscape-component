
/**
 * @author huwb / http://huwbowles.com/
 *
 * God-rays (crepuscular rays)
 *
 * Similar implementation to the one used by Crytek for CryEngine 2 [Sousa2008].
 * Blurs a mask generated from the depth map along radial lines emanating from the light
 * source. The blur repeatedly applies a blur filter of increasing support but constant
 * sample count to produce a blur filter with large support.
 *
 * My implementation performs 3 passes, similar to the implementation from Sousa. I found
 * just 6 samples per pass produced acceptible results. The blur is applied three times,
 * with decreasing filter support. The result is equivalent to a single pass with
 * 6*6*6 = 216 samples.
 *
 * References:
 *
 * Sousa2008 - Crysis Next Gen Effects, GDC2008, http://www.crytek.com/sites/default/files/GDC08_SousaT_CrysisEffects.ppt
 */

THREE.ShaderNoise = {

    /**
     * The god-ray generation shader.
     *
     * First pass:
     *
     * The input is the depth map. I found that the output from the
     * THREE.MeshDepthMaterial material was directly suitable without
     * requiring any treatment whatsoever.
     *
     * The depth map is blurred along radial lines towards the "sun". The
     * output is written to a temporary render target (I used a 1/4 sized
     * target).
     *
     * Pass two & three:
     *
     * The results of the previous pass are re-blurred, each time with a
     * decreased distance between samples.
     */

    'noise_generate': {

            uniforms: {

                fTime: {
                    value: null
                },
                vUv: {
                    value: new THREE.Vector2(0, 0)
                }

            },

            vertexShader: [
                "varying vec2 vUv;" ,
                "uniform vec2 scale;" ,
                "uniform vec2 offset;" ,
                "void main( void ) {" ,
                "    vUv = uv * scale + offset;" ,
                "    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );" ,
                "}"
                ].join("\n"),

            fragmentShader: [
                "			// Description : Array and textureless GLSL 3D simplex noise function." ,
                "			//      Author : Ian McEwan, Ashima Arts." ,
                "			//  Maintainer : ijm" ,
                "			//     Lastmod : 20110409 (stegu)" ,
                "			//     License : Copyright (C) 2011 Ashima Arts. All rights reserved." ,
                "			//               Distributed under the MIT License. See LICENSE file." ,
                "			//" ,
                "			uniform float time;" ,
                "			varying vec2 vUv;" ,
                "			vec4 permute( vec4 x ) {" ,
                "				return mod( ( ( x * 34.0 ) + 1.0 ) * x, 289.0 );" ,
                "			}" ,
                "			vec4 taylorInvSqrt( vec4 r ) {" ,
                "				return 1.79284291400159 - 0.85373472095314 * r;" ,
                "			}" ,
                "			float snoise( vec3 v ) {" ,
                "				const vec2 C = vec2( 1.0 / 6.0, 1.0 / 3.0 );" ,
                "				const vec4 D = vec4( 0.0, 0.5, 1.0, 2.0 );" ,
                "				// First corner" ,
                "				vec3 i  = floor( v + dot( v, C.yyy ) );" ,
                "				vec3 x0 = v - i + dot( i, C.xxx );" ,
                "				// Other corners" ,
                "				vec3 g = step( x0.yzx, x0.xyz );" ,
                "				vec3 l = 1.0 - g;" ,
                "				vec3 i1 = min( g.xyz, l.zxy );" ,
                "				vec3 i2 = max( g.xyz, l.zxy );" ,
                "				vec3 x1 = x0 - i1 + 1.0 * C.xxx;" ,
                "				vec3 x2 = x0 - i2 + 2.0 * C.xxx;" ,
                "				vec3 x3 = x0 - 1. + 3.0 * C.xxx;" ,
                "				// Permutations" ,
                "				i = mod( i, 289.0 );" ,
                "				vec4 p = permute( permute( permute(" ,
                "						 i.z + vec4( 0.0, i1.z, i2.z, 1.0 ) )" ,
                "					   + i.y + vec4( 0.0, i1.y, i2.y, 1.0 ) )" ,
                "					   + i.x + vec4( 0.0, i1.x, i2.x, 1.0 ) );" ,
                "				// Gradients" ,
                "				// ( N*N points uniformly over a square, mapped onto an octahedron.)" ,
                "				float n_ = 1.0 / 7.0; // N=7" ,
                "				vec3 ns = n_ * D.wyz - D.xzx;" ,
                "				vec4 j = p - 49.0 * floor( p * ns.z *ns.z );  //  mod(p,N*N)" ,
                "				vec4 x_ = floor( j * ns.z );" ,
                "				vec4 y_ = floor( j - 7.0 * x_ );    // mod(j,N)" ,
                "				vec4 x = x_ *ns.x + ns.yyyy;" ,
                "				vec4 y = y_ *ns.x + ns.yyyy;" ,
                "				vec4 h = 1.0 - abs( x ) - abs( y );" ,
                "				vec4 b0 = vec4( x.xy, y.xy );" ,
                "				vec4 b1 = vec4( x.zw, y.zw );" ,
                "				vec4 s0 = floor( b0 ) * 2.0 + 1.0;" ,
                "				vec4 s1 = floor( b1 ) * 2.0 + 1.0;" ,
                "				vec4 sh = -step( h, vec4( 0.0 ) );" ,
                "				vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;" ,
                "				vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;" ,
                "				vec3 p0 = vec3( a0.xy, h.x );" ,
                "				vec3 p1 = vec3( a0.zw, h.y );" ,
                "				vec3 p2 = vec3( a1.xy, h.z );" ,
                "				vec3 p3 = vec3( a1.zw, h.w );" ,
                "				// Normalise gradients" ,
                "				vec4 norm = taylorInvSqrt( vec4( dot( p0, p0 ), dot( p1, p1 ), dot( p2, p2 ), dot( p3, p3 ) ) );" ,
                "				p0 *= norm.x;" ,
                "				p1 *= norm.y;" ,
                "				p2 *= norm.z;" ,
                "				p3 *= norm.w;" ,
                "				// Mix final noise value" ,
                "				vec4 m = max( 0.6 - vec4( dot( x0, x0 ), dot( x1, x1 ), dot( x2, x2 ), dot( x3, x3 ) ), 0.0 );" ,
                "				m = m * m;" ,
                "				return 42.0 * dot( m*m, vec4( dot( p0, x0 ), dot( p1, x1 )," ,
                "											  dot( p2, x2 ), dot( p3, x3 ) ) );" ,
                "			}" ,
                "			float surface3( vec3 coord ) {" ,
                "				float n = 0.0;" ,
                "				n += 1.0 * abs( snoise( coord ) );" ,
                "				n += 0.5 * abs( snoise( coord * 2.0 ) );" ,
                "				n += 0.25 * abs( snoise( coord * 4.0 ) );" ,
                "				n += 0.125 * abs( snoise( coord * 8.0 ) );" ,
                "				return n;" ,
                "			}" ,
                "			void main( void ) {" ,
                "				vec3 coord = vec3( vUv, -time );" ,
                "				float n = surface3( coord );" ,
                "				gl_FragColor = vec4( vec3( n, n, n ), 1.0 );" ,
                "			}"
        ].join("\n"),

    }

}