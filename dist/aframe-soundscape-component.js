/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	/* global AFRAME */
	__webpack_require__(1);
	__webpack_require__(2);
	__webpack_require__(3);
	__webpack_require__(4)

	if (typeof AFRAME === 'undefined') {
	    throw new Error('Component attempted to register before AFRAME was available.');
	}

	/**
	 * soundscape component for A-Frame.
	 */
	AFRAME.registerComponent('aframe-soundscape', {
	    schema: {
	        noise: {
	            default: 0.0004
	        },
	        fogColor:{
	            default: 0x000000
	        },
	        colors: {
	            default: ['0xC07000']
	        },
	        textureBg:{
	            default:  "textures/terrain/backgrounddetailed6.jpg",
	        },
	        textureNormalMap:{
	            default: "textures/terrain/grasslight-big-nm.jpg"
	        },
	        texture: {
	            default:"textures/terrain/grasslight-big.jpg"
	        },
	        textureNormalMapCanvas:{
	            default:"soundScapeNM"
	        },
	        initTextureFunction:{
	            default:null,
	        }
	    },

	    /**
	     * Set if component needs multiple instancing.
	     */
	    multiple: false,

	    /**
	     * Called once when component is attached. Generally for initial setup.
	     */

	    init: function () {
	        this.data.initTextureFunction !== null ? window[this.data.initTextureFunction]():this.initSoundScape();
	    },

	    /**
	     * Called after textures have been loaded
	     */
	    initSoundScape: function () {
	        // SCENE (FINAL)
	        var el = this.el;
	        this.data.SCREEN_WIDTH = window.innerWidth;
	        this.data.SCREEN_HEIGHT = window.innerHeight;
	        this.camera = this.el.sceneEl.camera;
	        this.camera.position.set( -1200, 800, 1200 );
	        this.render = this.el.sceneEl.renderer;
	        this.data.sceneRenderTarget = new THREE.Scene();
	        this.data.cameraOrtho = new THREE.OrthographicCamera( this.data.SCREEN_WIDTH / - 2, this.data.SCREEN_WIDTH / 2, this.data.SCREEN_HEIGHT / 2, this.data.SCREEN_HEIGHT / - 2, -10000, 10000 );
	        this.data.cameraOrtho.position.z = 100;

	        this.data.sceneRenderTarget.add( this.data.cameraOrtho );

	        this.data.uniformsNoise;
	        this.data.uniformsNormal;
	        this.data.uniformsTerrain;
	        this.data.heightMap;
	        this.data.normalMap;
	        this.data.quadTarget;

	        this.data.directionalLight;
	        this.data.pointLight;
	        this.data.terrain;

	        this.data.textureCounter = 0;

	        this.data.animDelta = 0;
	        this.data.animDeltaDir = -1;
	        this.data.lightVal = 0;
	        this.data.lightDir = 1;
	        this.data.clock = new THREE.Clock();

	        this.data.updateNoise = true;

	        this.data.animateTerrain = true;

	        this.data.mlib = {};
	        this.data.canvasMaterail = [];
	        this.data.canvasTexture = [];
	        for (var i = 0; i < this.el.attributes.length; i++) {
	            var attrib = this.el.attributes[i];
	            if (attrib.specified && attrib.name === 'canvas-material') {
	                this.data.canvasMaterail.push(this.el.components['canvas-material'].canvas)
	                var nmTex = document.getElementById(this.data.textureNormalMapCanvas)
	                if(nmTex !== null){
	                    this.data.canvasMaterail.push(nmTex.components['canvas-material'].canvas)
	                }
	                break;
	            }
	        }

	        this.scene  = this.el.sceneEl.object3D;
	        this.scene.fog = new THREE.Fog( this.data.fogColor, 2000, 4000 );

	        // LIGHTS

	        this.scene.add( new THREE.AmbientLight( 0x111111 ) );

	        this.data.directionalLight = new THREE.DirectionalLight( 0xffffff, 1.15 );
	        this.data.directionalLight.position.set( 500, 2000, 0 );
	        this.scene.add( this.data.directionalLight );

	        this.data.pointLight = new THREE.PointLight( 0xff4400, 1.5 );
	        this.data.pointLight.position.set( 0, 0, 0 );
	        this.scene.add( this.data.pointLight );


	        // HEIGHT + NORMAL MAPS

	        var normalShader = THREE.NormalMapShader;

	        var rx = 256, ry = 256;
	        var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };

	        this.data.heightMap  = new THREE.WebGLRenderTarget( rx, ry, pars );
	        this.data.heightMap.texture.generateMipmaps = false;

	        this.data.normalMap = new THREE.WebGLRenderTarget( rx, ry, pars );
	        this.data.normalMap.texture.generateMipmaps = false;

	        this.data.uniformsNoise = {

	            time:   { value: 1.0 },
	            scale:  { value: new THREE.Vector2( 1.5, 1.5 ) },
	            offset: { value: new THREE.Vector2( 0, 0 ) }

	        };

	        this.data.uniformsNormal = THREE.UniformsUtils.clone( normalShader.uniforms );

	        this.data.uniformsNormal.height.value = 0.05;
	        this.data.uniformsNormal.resolution.value.set( rx, ry );
	        this.data.uniformsNormal.heightMap.value = this.data.heightMap.texture;

	        var vertexShader = THREE.ShaderNoise[ "noise_generate" ].vertexShader;

	        // TEXTURES

	        var loadingManager = new THREE.LoadingManager( function(){
	            this.data.terrain.visible = true;
	        }.bind(this));
	        var textureLoader = new THREE.TextureLoader( loadingManager );

	        var specularMap = new THREE.WebGLRenderTarget( 2048, 2048, pars );
	        specularMap.texture.generateMipmaps = false;

	        var diffuseTexture1 = textureLoader.load( this.data.texture );
	        var diffuseTexture2 = textureLoader.load( this.data.textureBg  );
	        var detailTexture = textureLoader.load( this.data.textureNormalMap );

	        diffuseTexture1.wrapS = diffuseTexture1.wrapT = THREE.RepeatWrapping;
	        diffuseTexture2.wrapS = diffuseTexture2.wrapT = THREE.RepeatWrapping;
	        detailTexture.wrapS = detailTexture.wrapT = THREE.RepeatWrapping;
	        specularMap.texture.wrapS = specularMap.texture.wrapT = THREE.RepeatWrapping;

	        var terrainShader = THREE.ShaderTerrain[ "terrain" ];

	        this.data.uniformsTerrain = THREE.UniformsUtils.clone( terrainShader.uniforms );

	        this.data.uniformsTerrain[ 'tNormal' ].value = this.data.normalMap.texture;
	        this.data.uniformsTerrain[ 'uNormalScale' ].value = 3.5;

	        this.data.uniformsTerrain[ 'tDisplacement' ].value = this.data.heightMap.texture;
	        if(this.data.canvasMaterail.length){
	            this.data.canvasTexture.push(new THREE.CanvasTexture( this.data.canvasMaterail[0] ));
	            this.data.canvasTexture[0].wrapS = this.data.canvasTexture[0].wrapT = THREE.RepeatWrapping;
	            this.data.uniformsTerrain[ 'tDiffuse1' ].value = this.data.canvasTexture[0];
	            if(this.data.canvasMaterail.length > 1){
	                this.data.canvasTexture.push(new THREE.CanvasTexture( this.data.canvasMaterail[1] ));
	                this.data.canvasTexture[1].wrapS = this.data.canvasTexture[1].wrapT = THREE.RepeatWrapping;
	                this.data.uniformsTerrain[ 'tDiffuse2' ].value = this.data.canvasTexture[1];
	            }else{
	                this.data.uniformsTerrain[ 'tDiffuse2' ].value = diffuseTexture2;
	            }
	        }else{
	            this.data.uniformsTerrain[ 'tDiffuse1' ].value = diffuseTexture1;
	            this.data.uniformsTerrain[ 'tDiffuse2' ].value = diffuseTexture2;
	        }


	        this.data.uniformsTerrain[ 'tSpecular' ].value = specularMap.texture;
	        this.data.uniformsTerrain[ 'tDetail' ].value = detailTexture;

	        this.data.uniformsTerrain[ 'enableDiffuse1' ].value = true;
	        this.data.uniformsTerrain[ 'enableDiffuse2' ].value = true;
	        this.data.uniformsTerrain[ 'enableSpecular' ].value = true;

	        this.data.uniformsTerrain[ 'diffuse' ].value.setHex( 0xffffff );
	        this.data.uniformsTerrain[ 'specular' ].value.setHex( 0xffffff );

	        this.data.uniformsTerrain[ 'shininess' ].value = 30;

	        this.data.uniformsTerrain[ 'uDisplacementScale' ].value = 375;

	        this.data.uniformsTerrain[ 'uRepeatOverlay' ].value.set( 6, 6 );

	        var params = [
	            [ 'heightmap', 	THREE.ShaderNoise[ "noise_generate" ].fragmentShader, 	vertexShader, this.data.uniformsNoise, false ],
	            [ 'normal', 	normalShader.fragmentShader,  normalShader.vertexShader, this.data.uniformsNormal, false ],
	            [ 'terrain', 	terrainShader.fragmentShader, terrainShader.vertexShader, this.data.uniformsTerrain, true ]
	        ];

	        for( var i = 0; i < params.length; i ++ ) {

	            this.data.material = new THREE.ShaderMaterial( {

	                uniforms: 		params[ i ][ 3 ],
	                vertexShader: 	params[ i ][ 2 ],
	                fragmentShader: params[ i ][ 1 ],
	                lights: 		params[ i ][ 4 ],
	                fog: 			true
	            } );

	            this.data.mlib[ params[ i ][ 0 ] ] = this.data.material;

	        }


	        var plane = new THREE.PlaneBufferGeometry( this.data.SCREEN_WIDTH, this.data.SCREEN_HEIGHT );

	        this.data.quadTarget = new THREE.Mesh( plane, new THREE.MeshBasicMaterial( { color: 0x000000 } ) );
	        this.data.quadTarget.position.z = -500;
	        this.data.sceneRenderTarget.add( this.data.quadTarget );

	        // TERRAIN MESH

	        var geometryTerrain = new THREE.PlaneBufferGeometry( 6000, 6000, 256, 256 );

	        THREE.BufferGeometryUtils.computeTangents( geometryTerrain );

	        this.data.terrain = new THREE.Mesh( geometryTerrain, this.data.mlib[ 'terrain' ] );
	        this.data.terrain.position.set( 0, -125, 0 );
	        this.data.terrain.rotation.x = -Math.PI / 2;
	        this.data.terrain.visible = false;
	        this.scene.add( this.data.terrain );

	    },

	    /**
	     * Called when component is attached and when component data changes.
	     * Generally modifies the entity based on the data.
	     */
	    update: function (oldData) { },

	    /**
	     * Called when a component is removed (e.g., via removeAttribute).
	     * Generally undoes all modifications to the entity.
	     */
	    remove: function () { },

	    /**
	     * Called on each this.scene tick.
	     */
	    tick: function (t) {
	        var delta = this.data.clock.getDelta();
	        //this.camera = this.el.sceneEl.camera;
	        this.render = this.el.sceneEl.renderer;
	        this.scene  = this.el.sceneEl.object3D;


	        if ( this.data.terrain.visible ) {


	            var time = Date.now() * 0.001;

	            var fLow = 0.1, fHigh = 0.8;

	            this.data.lightVal = THREE.Math.clamp( this.data.lightVal + 0.5 * delta * this.data.lightDir, fLow, fHigh );

	            var valNorm = ( this.data.lightVal - fLow ) / ( fHigh - fLow );

	            //this.scene.fog.color.setHSL( 0.1, 0.5, this.data.lightVal );

	            this.render.setClearColor( this.scene.fog.color );

	            this.data.directionalLight.intensity = THREE.Math.mapLinear( valNorm, 0, 1, 0.1, 1.15 );
	            this.data.pointLight.intensity = THREE.Math.mapLinear( valNorm, 0, 1, 0.9, 1.5 );

	            this.data.uniformsTerrain[ 'uNormalScale' ].value = THREE.Math.mapLinear( valNorm, 0, 1, 0.6, 3.5 );

	            if ( this.data.updateNoise ) {

	                this.data.animDelta = THREE.Math.clamp( this.data.animDelta + 0.00075 * this.data.animDeltaDir, 0, 0.05 );
	                this.data.uniformsNoise[ 'time' ].value += delta * this.data.animDelta;

	                this.data.uniformsNoise[ 'offset' ].value.x += delta * 0.05;

	                this.data.uniformsTerrain[ 'uOffset' ].value.x = 4 * this.data.uniformsNoise[ 'offset' ].value.x;

	                this.data.quadTarget.material = this.data.mlib[ 'heightmap' ];
	                this.render.render( this.data.sceneRenderTarget, this.data.cameraOrtho, this.data.heightMap, true );

	                this.data.quadTarget.material = this.data.mlib[ 'normal' ];
	                this.render.render( this.data.sceneRenderTarget, this.data.cameraOrtho , this.data.normalMap, true );

	            }

	            if(this.data.canvasTexture.length){
	                this.data.canvasTexture[0].needsUpdate = true;
	            }
	        }
	    },

	    /**
	     * Called when entity pauses.
	     * Use to stop or remove any dynamic or background behavior such as events.
	     */
	    pause: function () { },

	    /**
	     * Called when entity resumes.
	     * Use to continue or add any dynamic or background behavior such as events.
	     */
	    play: function () { }
	});


/***/ }),
/* 1 */
/***/ (function(module, exports) {

	/**
	 * @author alteredq / http://alteredqualia.com/
	 *
	 */

	THREE.ShaderTerrain = {

		/* -------------------------------------------------------------------------
		//	Dynamic terrain shader
		//		- Blinn-Phong
		//		- height + normal + diffuse1 + diffuse2 + specular + detail maps
		//		- point, directional and hemisphere lights (use with "lights: true" material option)
		//		- shadow maps receiving
		 ------------------------------------------------------------------------- */

		'terrain' : {

			uniforms: THREE.UniformsUtils.merge( [

				THREE.UniformsLib[ "fog" ],
				THREE.UniformsLib[ "lights" ],

				{

					"enableDiffuse1": { value: 0 },
					"enableDiffuse2": { value: 0 },
					"enableSpecular": { value: 0 },
					"enableReflection": { value: 0 },

					"tDiffuse1": { value: null },
					"tDiffuse2": { value: null },
					"tDetail": { value: null },
					"tNormal": { value: null },
					"tSpecular": { value: null },
					"tDisplacement": { value: null },

					"uNormalScale": { value: 1.0 },

					"uDisplacementBias": { value: 0.0 },
					"uDisplacementScale": { value: 1.0 },

					"diffuse": { value: new THREE.Color( 0xeeeeee ) },
					"specular": { value: new THREE.Color( 0x111111 ) },
					"shininess": { value: 30 },
					"opacity": { value: 1 },

					"uRepeatBase": { value: new THREE.Vector2( 1, 1 ) },
					"uRepeatOverlay": { value: new THREE.Vector2( 1, 1 ) },

					"uOffset": { value: new THREE.Vector2( 0, 0 ) }

				}

			] ),

			fragmentShader: [

				"uniform vec3 diffuse;",
				"uniform vec3 specular;",
				"uniform float shininess;",
				"uniform float opacity;",

				"uniform bool enableDiffuse1;",
				"uniform bool enableDiffuse2;",
				"uniform bool enableSpecular;",

				"uniform sampler2D tDiffuse1;",
				"uniform sampler2D tDiffuse2;",
				"uniform sampler2D tDetail;",
				"uniform sampler2D tNormal;",
				"uniform sampler2D tSpecular;",
				"uniform sampler2D tDisplacement;",

				"uniform float uNormalScale;",

				"uniform vec2 uRepeatOverlay;",
				"uniform vec2 uRepeatBase;",

				"uniform vec2 uOffset;",

				"varying vec3 vTangent;",
				"varying vec3 vBinormal;",
				"varying vec3 vNormal;",
				"varying vec2 vUv;",

				"varying vec3 vViewPosition;",

				THREE.ShaderChunk[ "common" ],
				THREE.ShaderChunk[ "bsdfs" ],
				THREE.ShaderChunk[ "lights_pars" ],
				THREE.ShaderChunk[ "shadowmap_pars_fragment" ],
				THREE.ShaderChunk[ "fog_pars_fragment" ],

				"float calcLightAttenuation( float lightDistance, float cutoffDistance, float decayExponent ) {",
	 				"if ( decayExponent > 0.0 ) {",
	 					"return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );",
	 				"}",
	 				"return 1.0;",
	 			"}",

				"void main() {",

					"vec3 outgoingLight = vec3( 0.0 );",	// outgoing light does not have an alpha, the surface does
					"vec4 diffuseColor = vec4( diffuse, opacity );",

					"vec3 specularTex = vec3( 1.0 );",

					"vec2 uvOverlay = uRepeatOverlay * vUv + uOffset;",
					"vec2 uvBase = uRepeatBase * vUv;",

					"vec3 normalTex = texture2D( tDetail, uvOverlay ).xyz * 2.0 - 1.0;",
					"normalTex.xy *= uNormalScale;",
					"normalTex = normalize( normalTex );",

					"if( enableDiffuse1 && enableDiffuse2 ) {",

						"vec4 colDiffuse1 = texture2D( tDiffuse1, uvOverlay );",
						"vec4 colDiffuse2 = texture2D( tDiffuse2, uvOverlay );",

						"colDiffuse1 = GammaToLinear( colDiffuse1, float( GAMMA_FACTOR ) );",
						"colDiffuse2 = GammaToLinear( colDiffuse2, float( GAMMA_FACTOR ) );",

						"diffuseColor *= mix ( colDiffuse1, colDiffuse2, 1.0 - texture2D( tDisplacement, uvBase ) );",

					" } else if( enableDiffuse1 ) {",

						"diffuseColor *= texture2D( tDiffuse1, uvOverlay );",

					"} else if( enableDiffuse2 ) {",

						"diffuseColor *= texture2D( tDiffuse2, uvOverlay );",

					"}",

					"if( enableSpecular )",
						"specularTex = texture2D( tSpecular, uvOverlay ).xyz;",

					"mat3 tsb = mat3( vTangent, vBinormal, vNormal );",
					"vec3 finalNormal = tsb * normalTex;",

					"vec3 normal = normalize( finalNormal );",
					"vec3 viewPosition = normalize( vViewPosition );",

					"vec3 totalDiffuseLight = vec3( 0.0 );",
					"vec3 totalSpecularLight = vec3( 0.0 );",

					// point lights

					"#if NUM_POINT_LIGHTS > 0",

						"for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {",

							"vec3 lVector = pointLights[ i ].position + vViewPosition.xyz;",

							"float attenuation = calcLightAttenuation( length( lVector ), pointLights[ i ].distance, pointLights[ i ].decay );",

							"lVector = normalize( lVector );",

							"vec3 pointHalfVector = normalize( lVector + viewPosition );",

							"float pointDotNormalHalf = max( dot( normal, pointHalfVector ), 0.0 );",
							"float pointDiffuseWeight = max( dot( normal, lVector ), 0.0 );",

							"float pointSpecularWeight = specularTex.r * max( pow( pointDotNormalHalf, shininess ), 0.0 );",

							"totalDiffuseLight += attenuation * pointLights[ i ].color * pointDiffuseWeight;",
							"totalSpecularLight += attenuation * pointLights[ i ].color * specular * pointSpecularWeight * pointDiffuseWeight;",

						"}",

					"#endif",

					// directional lights

					"#if NUM_DIR_LIGHTS > 0",

						"vec3 dirDiffuse = vec3( 0.0 );",
						"vec3 dirSpecular = vec3( 0.0 );",

						"for( int i = 0; i < NUM_DIR_LIGHTS; i++ ) {",

							"vec3 dirVector = directionalLights[ i ].direction;",
							"vec3 dirHalfVector = normalize( dirVector + viewPosition );",

							"float dirDotNormalHalf = max( dot( normal, dirHalfVector ), 0.0 );",
							"float dirDiffuseWeight = max( dot( normal, dirVector ), 0.0 );",

							"float dirSpecularWeight = specularTex.r * max( pow( dirDotNormalHalf, shininess ), 0.0 );",

							"totalDiffuseLight += directionalLights[ i ].color * dirDiffuseWeight;",
							"totalSpecularLight += directionalLights[ i ].color * specular * dirSpecularWeight * dirDiffuseWeight;",

						"}",

					"#endif",

					// hemisphere lights

					"#if NUM_HEMI_LIGHTS > 0",

						"vec3 hemiDiffuse  = vec3( 0.0 );",
						"vec3 hemiSpecular = vec3( 0.0 );",

						"for( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {",

							"vec3 lVector = hemisphereLightDirection[ i ];",

							// diffuse

							"float dotProduct = dot( normal, lVector );",
							"float hemiDiffuseWeight = 0.5 * dotProduct + 0.5;",

							"totalDiffuseLight += mix( hemisphereLights[ i ].groundColor, hemisphereLights[ i ].skyColor, hemiDiffuseWeight );",

							// specular (sky light)

							"float hemiSpecularWeight = 0.0;",

							"vec3 hemiHalfVectorSky = normalize( lVector + viewPosition );",
							"float hemiDotNormalHalfSky = 0.5 * dot( normal, hemiHalfVectorSky ) + 0.5;",
							"hemiSpecularWeight += specularTex.r * max( pow( hemiDotNormalHalfSky, shininess ), 0.0 );",

							// specular (ground light)

							"vec3 lVectorGround = -lVector;",

							"vec3 hemiHalfVectorGround = normalize( lVectorGround + viewPosition );",
							"float hemiDotNormalHalfGround = 0.5 * dot( normal, hemiHalfVectorGround ) + 0.5;",
							"hemiSpecularWeight += specularTex.r * max( pow( hemiDotNormalHalfGround, shininess ), 0.0 );",

							"totalSpecularLight += specular * mix( hemisphereLights[ i ].groundColor, hemisphereLights[ i ].skyColor, hemiDiffuseWeight ) * hemiSpecularWeight * hemiDiffuseWeight;",

						"}",

					"#endif",

					"outgoingLight += diffuseColor.xyz * ( totalDiffuseLight + ambientLightColor + totalSpecularLight );",

					"gl_FragColor = vec4( outgoingLight, diffuseColor.a );",	// TODO, this should be pre-multiplied to allow for bright highlights on very transparent objects

					THREE.ShaderChunk[ "fog_fragment" ],

				"}"

			].join( "\n" ),

			vertexShader: [

				"attribute vec4 tangent;",

				"uniform vec2 uRepeatBase;",

				"uniform sampler2D tNormal;",

				"#ifdef VERTEX_TEXTURES",

					"uniform sampler2D tDisplacement;",
					"uniform float uDisplacementScale;",
					"uniform float uDisplacementBias;",

				"#endif",

				"varying vec3 vTangent;",
				"varying vec3 vBinormal;",
				"varying vec3 vNormal;",
				"varying vec2 vUv;",

				"varying vec3 vViewPosition;",

				THREE.ShaderChunk[ "shadowmap_pars_vertex" ],
				THREE.ShaderChunk[ "fog_pars_vertex" ],

				"void main() {",

					"vNormal = normalize( normalMatrix * normal );",

					// tangent and binormal vectors

					"vTangent = normalize( normalMatrix * tangent.xyz );",

					"vBinormal = cross( vNormal, vTangent ) * tangent.w;",
					"vBinormal = normalize( vBinormal );",

					// texture coordinates

					"vUv = uv;",

					"vec2 uvBase = uv * uRepeatBase;",

					// displacement mapping

					"#ifdef VERTEX_TEXTURES",

						"vec3 dv = texture2D( tDisplacement, uvBase ).xyz;",
						"float df = uDisplacementScale * dv.x + uDisplacementBias;",
						"vec3 displacedPosition = normal * df + position;",

						"vec4 worldPosition = modelMatrix * vec4( displacedPosition, 1.0 );",
						"vec4 mvPosition = modelViewMatrix * vec4( displacedPosition, 1.0 );",

					"#else",

						"vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",
						"vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",

					"#endif",

					"gl_Position = projectionMatrix * mvPosition;",

					"vViewPosition = -mvPosition.xyz;",

					"vec3 normalTex = texture2D( tNormal, uvBase ).xyz * 2.0 - 1.0;",
					"vNormal = normalMatrix * normalTex;",

					THREE.ShaderChunk[ "shadowmap_vertex" ],
					THREE.ShaderChunk[ "fog_vertex" ],

				"}"

			].join( "\n" )

		}

	};


/***/ }),
/* 2 */
/***/ (function(module, exports) {

	/**
	 * @author alteredq / http://alteredqualia.com/
	 *
	 * Normal map shader
	 * - compute normals from heightmap
	 */

	THREE.NormalMapShader = {

		uniforms: {

			"heightMap":  { value: null },
			"resolution": { value: new THREE.Vector2( 512, 512 ) },
			"scale":      { value: new THREE.Vector2( 1, 1 ) },
			"height":     { value: 0.05 }

		},

		vertexShader: [

			"varying vec2 vUv;",

			"void main() {",

				"vUv = uv;",
				"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

			"}"

		].join( "\n" ),

		fragmentShader: [

			"uniform float height;",
			"uniform vec2 resolution;",
			"uniform sampler2D heightMap;",

			"varying vec2 vUv;",

			"void main() {",

				"float val = texture2D( heightMap, vUv ).x;",

				"float valU = texture2D( heightMap, vUv + vec2( 1.0 / resolution.x, 0.0 ) ).x;",
				"float valV = texture2D( heightMap, vUv + vec2( 0.0, 1.0 / resolution.y ) ).x;",

				"gl_FragColor = vec4( ( 0.5 * normalize( vec3( val - valU, val - valV, height  ) ) + 0.5 ), 1.0 );",

			"}"

		].join( "\n" )

	};


/***/ }),
/* 3 */
/***/ (function(module, exports) {

	
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


/***/ }),
/* 4 */
/***/ (function(module, exports) {

	/**
	 * @author mrdoob / http://mrdoob.com/
	 */

	THREE.BufferGeometryUtils = {

		computeTangents: function ( geometry ) {

			var index = geometry.index;
			var attributes = geometry.attributes;

			// based on http://www.terathon.com/code/tangent.html
			// (per vertex tangents)

			if ( index === null ||
				 attributes.position === undefined ||
				 attributes.normal === undefined ||
				 attributes.uv === undefined ) {

				console.warn( 'THREE.BufferGeometry: Missing required attributes (index, position, normal or uv) in BufferGeometry.computeTangents()' );
				return;

			}

			var indices = index.array;
			var positions = attributes.position.array;
			var normals = attributes.normal.array;
			var uvs = attributes.uv.array;

			var nVertices = positions.length / 3;

			if ( attributes.tangent === undefined ) {

				geometry.addAttribute( 'tangent', new THREE.BufferAttribute( new Float32Array( 4 * nVertices ), 4 ) );

			}

			var tangents = attributes.tangent.array;

			var tan1 = [], tan2 = [];

			for ( var k = 0; k < nVertices; k ++ ) {

				tan1[ k ] = new THREE.Vector3();
				tan2[ k ] = new THREE.Vector3();

			}

			var vA = new THREE.Vector3(),
				vB = new THREE.Vector3(),
				vC = new THREE.Vector3(),

				uvA = new THREE.Vector2(),
				uvB = new THREE.Vector2(),
				uvC = new THREE.Vector2(),

				sdir = new THREE.Vector3(),
				tdir = new THREE.Vector3();

			function handleTriangle( a, b, c ) {

				vA.fromArray( positions, a * 3 );
				vB.fromArray( positions, b * 3 );
				vC.fromArray( positions, c * 3 );

				uvA.fromArray( uvs, a * 2 );
				uvB.fromArray( uvs, b * 2 );
				uvC.fromArray( uvs, c * 2 );

				var x1 = vB.x - vA.x;
				var x2 = vC.x - vA.x;

				var y1 = vB.y - vA.y;
				var y2 = vC.y - vA.y;

				var z1 = vB.z - vA.z;
				var z2 = vC.z - vA.z;

				var s1 = uvB.x - uvA.x;
				var s2 = uvC.x - uvA.x;

				var t1 = uvB.y - uvA.y;
				var t2 = uvC.y - uvA.y;

				var r = 1.0 / ( s1 * t2 - s2 * t1 );

				sdir.set(
					( t2 * x1 - t1 * x2 ) * r,
					( t2 * y1 - t1 * y2 ) * r,
					( t2 * z1 - t1 * z2 ) * r
				);

				tdir.set(
					( s1 * x2 - s2 * x1 ) * r,
					( s1 * y2 - s2 * y1 ) * r,
					( s1 * z2 - s2 * z1 ) * r
				);

				tan1[ a ].add( sdir );
				tan1[ b ].add( sdir );
				tan1[ c ].add( sdir );

				tan2[ a ].add( tdir );
				tan2[ b ].add( tdir );
				tan2[ c ].add( tdir );

			}

			var groups = geometry.groups;

			if ( groups.length === 0 ) {

				groups = [ {
					start: 0,
					count: indices.length
				} ];

			}

			for ( var j = 0, jl = groups.length; j < jl; ++ j ) {

				var group = groups[ j ];

				var start = group.start;
				var count = group.count;

				for ( var i = start, il = start + count; i < il; i += 3 ) {

					handleTriangle(
						indices[ i + 0 ],
						indices[ i + 1 ],
						indices[ i + 2 ]
					);

				}

			}

			var tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
			var n = new THREE.Vector3(), n2 = new THREE.Vector3();
			var w, t, test;

			function handleVertex( v ) {

				n.fromArray( normals, v * 3 );
				n2.copy( n );

				t = tan1[ v ];

				// Gram-Schmidt orthogonalize

				tmp.copy( t );
				tmp.sub( n.multiplyScalar( n.dot( t ) ) ).normalize();

				// Calculate handedness

				tmp2.crossVectors( n2, t );
				test = tmp2.dot( tan2[ v ] );
				w = ( test < 0.0 ) ? - 1.0 : 1.0;

				tangents[ v * 4 ] = tmp.x;
				tangents[ v * 4 + 1 ] = tmp.y;
				tangents[ v * 4 + 2 ] = tmp.z;
				tangents[ v * 4 + 3 ] = w;

			}

			for ( var j = 0, jl = groups.length; j < jl; ++ j ) {

				var group = groups[ j ];

				var start = group.start;
				var count = group.count;

				for ( var i = start, il = start + count; i < il; i += 3 ) {

					handleVertex( indices[ i + 0 ] );
					handleVertex( indices[ i + 1 ] );
					handleVertex( indices[ i + 2 ] );

				}

			}

		}

	};


/***/ })
/******/ ]);