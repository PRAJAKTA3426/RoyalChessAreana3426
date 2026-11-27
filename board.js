import * as THREE from "../libraries/three.module.js";
import { createPiece, disposeObject } from "./pieces.js";
import { animateCapture, animatePiece } from "./animations.js";

const FILES = "abcdefgh";
const squareKey = (file, rank) => `${FILES[file]}${rank + 1}`;

export class ChessBoard {
  constructor(host, onSquare) {
    this.host = host;
    this.onSquare = onSquare;
    this.pieces = new Map();
    this.squares = new Map();
    this.highlights = [];
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x171e27);
    this.scene.fog = new THREE.Fog(0x171e27, 12, 24);
    this.camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
    this.camera.position.set(6.7, 9.2, 10.1);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.host.appendChild(this.renderer.domElement);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.cameraTarget = new THREE.Vector3(0, -.8, 0);
    this.cameraRadius = 18.5;
    this.azimuth = Math.PI / 4;
    this.polar = .88;
    this.drag = null;
    this.createScene();
    this.bindInput();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    this.resize();
    this.render();
  }

  createScene() {
    const ambient = new THREE.HemisphereLight(0xffe6bd, 0x263344, 2.5);
    this.scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffe2b2, 3.5);
    key.position.set(-4, 9, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048,2048);
    key.shadow.camera.left = -7;
    key.shadow.camera.right = 7;
    key.shadow.camera.top = 7;
    key.shadow.camera.bottom = -7;
    key.shadow.bias = -.0005;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x9dbce1, 1.8);
    fill.position.set(5, 6, -6);
    this.scene.add(fill);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.MeshStandardMaterial({color:0x171e27,roughness:.82}));
    floor.rotation.x = -Math.PI/2;
    floor.position.y = -.24;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const base = new THREE.Mesh(new THREE.BoxGeometry(8.42,.25,8.42), new THREE.MeshStandardMaterial({color:0x63472d,roughness:.37,metalness:.18}));
    base.position.y = -.12; base.receiveShadow = true; base.castShadow = true; this.scene.add(base);
    const top = new THREE.Mesh(new THREE.BoxGeometry(8.2,.12,8.2), new THREE.MeshStandardMaterial({color:0xb8955c,roughness:.34,metalness:.12}));
    top.position.y = .035; top.receiveShadow = true; this.scene.add(top);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(8.02,.1,8.02), new THREE.MeshStandardMaterial({color:0x452f20,roughness:.35}));
    edge.position.y = .135; this.scene.add(edge);
    const woodLight = new THREE.MeshStandardMaterial({color:0xd9bd86,roughness:.34});
    const woodDark = new THREE.MeshStandardMaterial({color:0x60452f,roughness:.4});
    const squareGeometry = new THREE.BoxGeometry(1, .055, 1);
    for (let rank=0;rank<8;rank++) for (let file=0;file<8;file++) {
      const square = new THREE.Mesh(squareGeometry, (file+rank)%2===0 ? woodLight : woodDark);
      square.position.set(file-3.5,.21,3.5-rank);
      square.receiveShadow = true;
      square.userData.square = squareKey(file,rank);
      this.scene.add(square);
      this.squares.set(square.userData.square,square);
      if (file===0 || rank===0) {
        const label = file===0 ? String(rank+1) : FILES[file];
        const canvas = document.createElement("canvas");
        canvas.width=128;canvas.height=128;
        const ctx=canvas.getContext("2d");
        ctx.fillStyle="#d6b877";ctx.font="bold 44px Arial";ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillText(label,64,66);
        const texture=new THREE.CanvasTexture(canvas);
        const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
        sprite.scale.set(.24,.24,1);
        sprite.position.set(file===0?-4.04:file-3.5,.25,rank===0?4.04:3.5-rank);
        this.scene.add(sprite);
      }
    }
    const frame = new THREE.Mesh(new THREE.BoxGeometry(8.65,.16,8.65), new THREE.MeshStandardMaterial({color:0x9d7c49,roughness:.27,metalness:.44}));
    frame.position.y=-.12;this.scene.add(frame);
    this.setCamera();
  }

  bindInput() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      this.drag = {x:event.clientX,y:event.clientY,azimuth:this.azimuth,polar:this.polar,moved:false,pointerId:event.pointerId};
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", event => {
      if (!this.drag || this.drag.pointerId!==event.pointerId) return;
      const dx=event.clientX-this.drag.x, dy=event.clientY-this.drag.y;
      if (Math.abs(dx)+Math.abs(dy)>4) this.drag.moved=true;
      if (this.drag.moved) {
        this.azimuth=this.drag.azimuth-dx*.006;
        this.polar=Math.max(.35,Math.min(1.35,this.drag.polar+dy*.004));
        this.setCamera();
      }
    });
    canvas.addEventListener("pointerup", event => {
      if (!this.drag || this.drag.pointerId!==event.pointerId) return;
      const moved=this.drag.moved;
      this.drag=null;
      if (!moved) this.pick(event.clientX,event.clientY);
    });
    canvas.addEventListener("wheel", event => {
      event.preventDefault();
      this.cameraRadius=Math.max(11,Math.min(22,this.cameraRadius+event.deltaY*.008));
      this.setCamera();
    },{passive:false});
    canvas.addEventListener("contextmenu",event=>event.preventDefault());
  }

  pick(clientX,clientY) {
    const rect=this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((clientX-rect.left)/rect.width*2-1,-((clientY-rect.top)/rect.height)*2+1);
    this.raycaster.setFromCamera(this.pointer,this.camera);
    const hits=this.raycaster.intersectObjects([...this.squares.values()],false);
    if(hits.length) this.onSquare(hits[0].object.userData.square);
  }

  setCamera() {
    const sin=Math.sin(this.polar);
    this.camera.position.set(
      this.cameraTarget.x+this.cameraRadius*sin*Math.sin(this.azimuth),
      this.cameraTarget.y+this.cameraRadius*Math.cos(this.polar),
      this.cameraTarget.z+this.cameraRadius*sin*Math.cos(this.azimuth)
    );
    this.camera.lookAt(this.cameraTarget);
  }

  resize() {
    const width=Math.max(1,this.host.clientWidth),height=Math.max(1,this.host.clientHeight);
    this.camera.aspect=width/height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width,height,false);
  }

  positionOf(square) {
    const file=FILES.indexOf(square[0]),rank=Number(square[1])-1;
    return {x:file-3.5,z:3.5-rank};
  }

  sync(position) {
    for(const piece of this.pieces.values()) {
      this.scene.remove(piece);
      disposeObject(piece);
    }
    this.pieces.clear();
    for(let rank=0;rank<8;rank++) for(let file=0;file<8;file++) {
      const data=position[rank][file];
      if(!data) continue;
      const square=`${FILES[file]}${8-rank}`;
      const piece=createPiece(data.type,data.color);
      const point=this.positionOf(square);
      piece.position.set(point.x,.24,point.z);
      piece.userData.square=square;
      this.scene.add(piece);
      this.pieces.set(square,piece);
    }
  }

  movePiece(from,to,capturedSquare=to) {
    return new Promise(resolve=>{
      const moving=this.pieces.get(from);
      const captured=this.pieces.get(capturedSquare);
      if(!moving){resolve();return;}
      if(captured && captured!==moving) {
        this.pieces.delete(capturedSquare);
        animateCapture(captured);
      }
      this.pieces.delete(from);
      this.pieces.set(to,moving);
      moving.userData.square=to;
      animatePiece(this.scene,moving,this.positionOf(from),this.positionOf(to),resolve,300);
    });
  }

  promotePiece(square,type,color) {
    const old=this.pieces.get(square);
    if(old){this.scene.remove(old);disposeObject(old);}
    const piece=createPiece(type,color);
    const point=this.positionOf(square);
    piece.position.set(point.x,.24,point.z);
    piece.userData.square=square;
    this.scene.add(piece);
    this.pieces.set(square,piece);
  }

  setHighlights(selected,targets=[],checkSquare=null) {
    for(const marker of this.highlights){this.scene.remove(marker);disposeObject(marker);}
    this.highlights=[];
    const add=(square,color,opacity)=>{
      if(!square)return;
      const point=this.positionOf(square);
      const marker=new THREE.Mesh(new THREE.PlaneGeometry(.92,.92),new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
      marker.rotation.x=-Math.PI/2;
      marker.position.set(point.x,.244,point.z);
      this.scene.add(marker);
      this.highlights.push(marker);
    };
    for(const square of targets)add(square,0x68c68c,.38);
    if(selected)add(selected,0xe8c05e,.42);
    if(checkSquare)add(checkSquare,0xd94747,.48);
  }

  render() {
    this.renderer.render(this.scene,this.camera);
    this.animationFrame=requestAnimationFrame(()=>this.render());
  }

  dispose() {
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    disposeObject(this.scene);
    this.renderer.dispose();
    this.host.replaceChildren();
  }
}
