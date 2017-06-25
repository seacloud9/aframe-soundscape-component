/* global AFRAME */
require('./vendor/ShaderTerrain.js');
require('./vendor/NormalMapShader.js');
require('./vendor/fragementNoiseShader.js');
require('./vendor/BufferGeometryUtils.js')

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
            default: 0x025e7f
        },
        colors: {
            default: ['0x025e7f']
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
        this.hasInit = false;
        if(this.data.initTextureFunction !== null){
            this.pause()
            window[this.data.initTextureFunction].apply(this)
        }else{
            this.hasInit = true;
            this.initSoundScape();
        }
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
        if( this.hasInit ){
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
