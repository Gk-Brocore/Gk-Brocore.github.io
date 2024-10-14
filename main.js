// SETTINGS of this demo:
const SETTINGS = {
  gltfModelURL: 'Necklace/HLess_Necklace.gltf',
  cubeMapURL: 'Bridge2/',
  offsetYZ: [-1, 0], // offset of the model in 3D along vertical and depth axis
  scale: 1.5
};

let THREECAMERA = null;


// build the 3D. called once when Jeeliz Face Filter is OK
function init_threeScene(spec){
  const threeStuffs = JeelizThreeHelper.init(spec, null);

  // CREATE THE ENVMAP:
  const path = SETTINGS.cubeMapURL;
  const format = '.jpg';
  const envMap = new THREE.CubeTextureLoader().load( [
    path + 'posx' + format, path + 'negx' + format,
    path + 'posy' + format, path + 'negy' + format,
    path + 'posz' + format, path + 'negz' + format
  ] );


    // envMap texture:
    const textureEquirec = new THREE.TextureLoader().load( SETTINGS.cubeMapURL );
    textureEquirec.mapping = THREE.EquirectangularReflectionMapping;
    textureEquirec.magFilter = THREE.LinearFilter;
    textureEquirec.minFilter = THREE.LinearMipMapLinearFilter;

  // IMPORT THE GLTF MODEL:
  // from https://threejs.org/examples/#webgl_loader_gltf
  const gltfLoader = new THREE.GLTFLoader();
  gltfLoader.load( SETTINGS.gltfModelURL, function ( gltf ) {
    gltf.scene.traverse( function ( child ) {
      if ( child.isMesh ) {
   // Apply the custom shader with fading
    const uniforms = {
        roughness: {value: 0},
        metalness: {value: 1},
        reflectivity: {value: 1},
        envMap: {value: textureEquirec},
        envMapIntensity: {value: 1},
        diffuse: {value: new THREE.Color().setHex(0xffffff)},
        uBranchFading: {value: new THREE.Vector2(-90, 60)} // first value: position (lower -> to the back), second: transition brutality
      };
   uniforms.envMap.value = envMap; // Set the envMap uniform

   // Custom uniforms for branch fading
   uniforms.uBranchFading = { value: new THREE.Vector2(-90, 6) }; // Adjust as needed

   // Tweak vertex shader to pass Z position of vertices
   let vertexShaderSource = "varying float vPosZ;\n" + THREE.ShaderLib.standard.vertexShader;
   vertexShaderSource = vertexShaderSource.replace('#include <fog_vertex>', 'vPosZ = position.z;');

   // Tweak fragment shader to apply fading based on Z position
   let fragmentShaderSource = "uniform vec2 uBranchFading;\n varying float vPosZ;\n" + THREE.ShaderLib.standard.fragmentShader;
   const GLSLcomputeAlpha = 'gl_FragColor.a = smoothstep(uBranchFading.x - uBranchFading.y * 0.5, uBranchFading.x + uBranchFading.y * 0.5, vPosZ);';
   fragmentShaderSource = fragmentShaderSource.replace('#include <fog_fragment>', GLSLcomputeAlpha);

   // Create ShaderMaterial with custom shaders and uniforms
   child.material = new THREE.ShaderMaterial({
     vertexShader: vertexShaderSource,
     fragmentShader: fragmentShaderSource,
     uniforms: uniforms,
     flatShading: false,
     transparent: true, // Make the material transparent
     extensions: { // fix for https://github.com/jeeliz/jeelizFaceFilter/issues/154
      //derivatives: true,
      //shaderTextureLOD: true
    }
   });

   child.material.envMap = envMap; // Set the envMap for reflections
      }
    } );
    gltf.scene.frustumCulled = false;
    
    // center and scale the object:
    const bbox = new THREE.Box3().expandByObject(gltf.scene);

    // center the model:
    const centerBBox = bbox.getCenter(new THREE.Vector3());
    gltf.scene.position.add(centerBBox.multiplyScalar(-1));
    gltf.scene.position.add(new THREE.Vector3(0,SETTINGS.offsetYZ[0], SETTINGS.offsetYZ[1]));

    // scale the model according to its width:
    const sizeX = bbox.getSize(new THREE.Vector3()).x;
    gltf.scene.scale.multiplyScalar(SETTINGS.scale / sizeX);


    const occluderMesh = JeelizThreeHelper.create_threejsOccluder("Necklace/face.json");

    
  // vertical offset:
  const dy = 0.07;

     // create and add the occluder:
    // occluderMesh.rotation.set(0.3, 0, 0);
     occluderMesh.position.set(0, 0.03 + dy,-0.04);
     occluderMesh.scale.multiplyScalar(0.0084);


  threeStuffs.faceObject.add(occluderMesh);
    // dispatch the model:
    threeStuffs.faceObject.add(gltf.scene);
  } ); //end gltfLoader.load callback
  
  //CREATE THE CAMERA
  THREECAMERA = JeelizThreeHelper.create_camera();
} //end init_threeScene()


//entry point:
function main(){
  JeelizResizer.size_canvas({
    canvasId: 'jeeFaceFilterCanvas',
    isFullScreen: true,
    isApplyCSS: true,
    callback: start,
    onResize: function(){
      JeelizThreeHelper.update_camera(THREECAMERA);
    }
  })
}


function start(){
  JEELIZFACEFILTER.init({ 
    videoSettings:{ // increase the default video resolution since we are in full screen
      'idealWidth': 1280,  // ideal video width in pixels
      'idealHeight': 800,  // ideal video height in pixels
      'maxWidth': 1920,    // max video width in pixels
      'maxHeight': 1920    // max video height in pixels
    },
    followZRot: true,
    canvasId: 'jeeFaceFilterCanvas',
    NNCPath: 'neuralNets/', //root of NN_DEFAULT.json file
    callbackReady: function(errCode, spec){
      if (errCode){
        console.log('AN ERROR HAPPENS. SORRY BRO :( . ERR =', errCode);
        return;
      }

      console.log('INFO: TruDJs IS READY');
      init_threeScene(spec);
    }, //end callbackReady()

    // called at each render iteration (drawing loop):
    callbackTrack: function(detectState){
      JeelizThreeHelper.render(detectState, THREECAMERA);
    }
  }); //end JEELIZFACEFILTER.init call
} //end start()


window.addEventListener('load', main);