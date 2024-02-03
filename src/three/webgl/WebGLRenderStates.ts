import { WebGLLights } from './WebGLLights';

function WebGLRenderState( extensions: any, capabilities: any ) {

  //@ts-expect-error
	const lights = new WebGLLights( extensions, capabilities );

	const lightsArray: any[] = [];
	const shadowsArray: any[] = [];

	function init() {

		lightsArray.length = 0;
		shadowsArray.length = 0;

	}

	function pushLight( light: any ) {

		lightsArray.push( light );

	}

	function pushShadow( shadowLight: any ) {

		shadowsArray.push( shadowLight );

	}

	function setupLights( physicallyCorrectLights: any ) {

		lights.setup( lightsArray, physicallyCorrectLights );

	}

	function setupLightsView( camera: any ) {

		lights.setupView( lightsArray, camera );

	}

	const state = {
		lightsArray: lightsArray,
		shadowsArray: shadowsArray,

		lights: lights
	};

	return {
		init: init,
		state: state,
		setupLights: setupLights,
		setupLightsView: setupLightsView,

		pushLight: pushLight,
		pushShadow: pushShadow
	};

}

function WebGLRenderStates( extensions: any, capabilities: any ) {

	let renderStates = new WeakMap();

	function get( scene: any, renderCallDepth = 0 ) {

		const renderStateArray = renderStates.get( scene );
		let renderState;

		if ( renderStateArray === undefined ) {

      //@ts-expect-error
			renderState = new WebGLRenderState( extensions, capabilities );
			renderStates.set( scene, [ renderState ] );

		} else {

			if ( renderCallDepth >= renderStateArray.length ) {

        //@ts-expect-error
				renderState = new WebGLRenderState( extensions, capabilities );
				renderStateArray.push( renderState );

			} else {

				renderState = renderStateArray[ renderCallDepth ];

			}

		}

		return renderState;

	}

	function dispose() {

		renderStates = new WeakMap();

	}

	return {
		get: get,
		dispose: dispose
	};

}


export { WebGLRenderStates };
