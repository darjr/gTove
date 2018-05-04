import * as React from 'react';
import * as PropTypes from 'prop-types';
import * as THREE from 'three';
import {Geometry} from 'three/three-core';
import {Dispatch} from 'redux';

import {buildEuler, buildVector3} from '../util/threeUtils';
import getHighlightShaderMaterial from '../shaders/highlightShader';
import getMiniShaderMaterial from '../shaders/miniShader';
import {DriveMetadata, MiniAppProperties} from '../@types/googleDrive';
import {ObjectEuler, ObjectVector3} from '../@types/scenario';
import {ReduxStoreType} from '../redux/mainReducer';
import {FileAPI} from '../util/fileUtils';
import {updateMiniMetadataLocalAction} from '../redux/scenarioReducer';
import {addFilesAction} from '../redux/fileIndexReducer';

interface TabletopMiniComponentProps {
    miniId: string;
    fullDriveMetadata: {[key: string]: DriveMetadata};
    dispatch: Dispatch<ReduxStoreType>;
    fileAPI: FileAPI;
    metadata: DriveMetadata<MiniAppProperties>;
    snapMini: (miniId: string) => {positionObj: ObjectVector3, rotationObj: ObjectEuler, scaleFactor: number, elevation: number};
    texture: THREE.Texture | null;
    selected: boolean;
    opacity: number;
}

export default class TabletopMiniComponent extends React.Component<TabletopMiniComponentProps> {

    static ORIGIN = new THREE.Vector3();
    static UP = new THREE.Vector3(0, 1, 0);
    static DOWN = new THREE.Vector3(0, -1, 0);

    static MINI_THICKNESS = 0.05;
    static MINI_WIDTH = 1;
    static MINI_HEIGHT = 1.2;
    static MINI_ASPECT_RATIO = TabletopMiniComponent.MINI_WIDTH / TabletopMiniComponent.MINI_HEIGHT;
    static MINI_ADJUST = new THREE.Vector3(0, TabletopMiniComponent.MINI_THICKNESS, -TabletopMiniComponent.MINI_THICKNESS / 2);
    static HIGHLIGHT_SCALE_VECTOR = new THREE.Vector3(1.1, 1.1, 1.5);
    static HIGHLIGHT_MINI_ADJUST = new THREE.Vector3(0, 0, -TabletopMiniComponent.MINI_THICKNESS / 4);
    static ROTATION_XZ = new THREE.Euler(-Math.PI / 2, 0, 0);
    static ARROW_SIZE = 0.1;

    static propTypes = {
        miniId: PropTypes.string.isRequired,
        fullDriveMetadata: PropTypes.object.isRequired,
        dispatch: PropTypes.func.isRequired,
        fileAPI: PropTypes.object.isRequired,
        metadata: PropTypes.object.isRequired,
        snapMini: PropTypes.func.isRequired,
        texture: PropTypes.object,
        selected: PropTypes.bool.isRequired,
        opacity: PropTypes.number.isRequired
    };

    componentWillMount() {
        this.checkMetadata();
    }

    componentWillReceiveProps(props: TabletopMiniComponentProps) {
        this.checkMetadata(props);
    }

    private checkMetadata(props: TabletopMiniComponentProps = this.props) {
        if (props.metadata && !props.metadata.appProperties) {
            if (props.fullDriveMetadata[props.metadata.id]) {
                props.dispatch(updateMiniMetadataLocalAction(props.miniId, props.fullDriveMetadata[props.metadata.id]));
            } else {
                props.fileAPI.getFullMetadata(props.metadata.id)
                    .then((fullMetadata) => {
                        props.dispatch(addFilesAction([fullMetadata]));
                    })
                    .catch((err) => {console.error(err)})
            }
        }
    }

    renderMini() {
        const {positionObj, rotationObj, scaleFactor, elevation} = this.props.snapMini(this.props.miniId);
        const position = buildVector3(positionObj);
        const rotation = buildEuler(rotationObj);
        const scale = new THREE.Vector3(scaleFactor, scaleFactor, scaleFactor);
        const appProperties = this.props.metadata.appProperties;
        const width = Number(appProperties.width);
        const height = Number(appProperties.height);
        const aspectRatio = width / height;
        const rangeU = (aspectRatio > TabletopMiniComponent.MINI_ASPECT_RATIO ? TabletopMiniComponent.MINI_WIDTH : aspectRatio / TabletopMiniComponent.MINI_HEIGHT);
        const offU = 0.5;
        const rangeV = (aspectRatio > TabletopMiniComponent.MINI_ASPECT_RATIO ? TabletopMiniComponent.MINI_WIDTH / aspectRatio : TabletopMiniComponent.MINI_HEIGHT);
        const offV = (1 - TabletopMiniComponent.MINI_HEIGHT / rangeV) / 2;
        let offset = TabletopMiniComponent.MINI_ADJUST.clone();
        const arrowDir = elevation > TabletopMiniComponent.ARROW_SIZE ?
            TabletopMiniComponent.UP :
            (elevation < -TabletopMiniComponent.MINI_HEIGHT - TabletopMiniComponent.ARROW_SIZE ? TabletopMiniComponent.DOWN : null);
        const arrowLength = (elevation > 0 ?
            elevation + TabletopMiniComponent.MINI_THICKNESS :
            (-elevation - TabletopMiniComponent.MINI_HEIGHT - TabletopMiniComponent.MINI_THICKNESS)) / scaleFactor;
        if (arrowDir) {
            offset.y += elevation / scaleFactor;
        }
        return (
            <group position={position} rotation={rotation} scale={scale}>
                <group position={offset} ref={(group: any) => {
                    if (group) {
                        group.userDataA = {miniId: this.props.miniId}
                    }
                }}>
                    <mesh>
                        <extrudeGeometry
                            settings={{amount: TabletopMiniComponent.MINI_THICKNESS, bevelEnabled: false, extrudeMaterial: 1}}
                            UVGenerator={{
                                generateTopUV: (geometry: Geometry, vertices: number[], indexA: number, indexB: number, indexC: number) => {
                                    let result = THREE.ExtrudeGeometry.WorldUVGenerator.generateTopUV(geometry, vertices, indexA, indexB, indexC);
                                    return result.map((uv) => (
                                        new THREE.Vector2(offU + uv.x / rangeU, offV + uv.y / rangeV)
                                    ));
                                },
                                generateSideWallUV: () => ([
                                    new THREE.Vector2(0, 0),
                                    new THREE.Vector2(0, 0),
                                    new THREE.Vector2(0, 0),
                                    new THREE.Vector2(0, 0)
                                ])
                            }}
                        >
                            <shapeResource resourceId='mini'/>
                        </extrudeGeometry>
                        {getMiniShaderMaterial(this.props.texture, this.props.opacity)}
                    </mesh>
                    {
                        (!this.props.selected) ? null : (
                            <mesh position={TabletopMiniComponent.HIGHLIGHT_MINI_ADJUST} scale={TabletopMiniComponent.HIGHLIGHT_SCALE_VECTOR}>
                                <extrudeGeometry settings={{amount: TabletopMiniComponent.MINI_THICKNESS, bevelEnabled: false}}>
                                    <shapeResource resourceId='mini'/>
                                </extrudeGeometry>
                                {getHighlightShaderMaterial()}
                            </mesh>
                        )
                    }
                </group>
                {
                    arrowDir ? (
                        <arrowHelper
                            origin={TabletopMiniComponent.ORIGIN}
                            dir={arrowDir}
                            length={arrowLength}
                            headLength={TabletopMiniComponent.ARROW_SIZE}
                            headWidth={TabletopMiniComponent.ARROW_SIZE}
                        />
                    ) : null
                }
                <group ref={(group: any) => {
                    if (group) {
                        group.userDataA = {miniId: this.props.miniId}
                    }
                }}>
                    <mesh rotation={TabletopMiniComponent.ROTATION_XZ}>
                        <extrudeGeometry settings={{amount: TabletopMiniComponent.MINI_THICKNESS, bevelEnabled: false}}>
                            <shapeResource resourceId='base'/>
                        </extrudeGeometry>
                        <meshPhongMaterial color='black' transparent={this.props.opacity < 1.0} opacity={this.props.opacity}/>
                    </mesh>
                    {
                        (!this.props.selected) ? null : (
                            <mesh rotation={TabletopMiniComponent.ROTATION_XZ} scale={TabletopMiniComponent.HIGHLIGHT_SCALE_VECTOR}>
                                <extrudeGeometry settings={{amount: TabletopMiniComponent.MINI_THICKNESS, bevelEnabled: false}}>
                                    <shapeResource resourceId='base'/>
                                </extrudeGeometry>
                                {getHighlightShaderMaterial()}
                            </mesh>
                        )
                    }
                </group>
            </group>
        );
    }

    render() {
        return (this.props.metadata && this.props.metadata.appProperties) ? this.renderMini() : null;
    }
}