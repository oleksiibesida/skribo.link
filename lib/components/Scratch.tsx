import React, { useEffect, useRef, forwardRef, ForwardedRef }  from 'react';

import styles from '/styles/scratch.module.css'

type PointerEvent = { mouse?: MouseEvent, touch?: TouchEvent }

export default forwardRef(function ScratchCard({ src, style }: any, ref: ForwardedRef<HTMLDivElement>) {
  // HTMLElement references
  let canvasRef = useRef<HTMLCanvasElement>(null);
  let imgRef = useRef<HTMLImageElement>(null);

  // stores records for mouse and touch pointers
  let position  = useRef<Record<string, { x: number, y: number }>>({})

  const defineCanvas = () => {
    console.log('fff')
    // define
    const canvas  = canvasRef.current!;
    const context = canvas.getContext("2d")!;

    // update width of canvas so it fills the screen
    canvas.width = innerWidth;
    canvas.height = innerHeight;

    // register events for the canvas
    new Array<[string, (e: any) => any]>(
      // 🖱️ mouse events
      ["mousedown",  mouse => scratchStart({ mouse })],
      ["mousemove",  mouse => scratchMove({ mouse })],
      ["mouseup",    mouse => scratchEnd({ mouse })],
      // 👆 touch events
      ["touchstart", touch => scratchStart({ touch })],
      ["touchmove",  touch => scratchMove({ touch })],
      ["touchend",   touch => scratchEnd({ touch })],
    // add listeners
    ).forEach(listener => canvas.addEventListener(...listener));
    
    // fill the canvas with a 🖼️ cover
    context.fillStyle = '#888888'
    context.fillRect(0, 0, innerWidth, innerHeight)
    context.filter = `blur(${innerWidth/4}px)`;
    context.drawImage(imgRef.current!, 0, 0, innerWidth, innerHeight)
    context.filter = "blur(0px)";

    imgRef.current!.setAttribute('style', 'display: flex');

    // setup scratch brush
    context.lineWidth = innerWidth/20;
    context.lineJoin = "round";    
  }

  // fired when a new pointer is touched the scratch surface
  const scratchStart = (event: PointerEvent) => array(event).forEach(point => {
    position.current[point.identifier] = { x: point.clientX, y: point.clientY }});

  // fired when pointer scratches the surfafce
  const scratchMove = (event: PointerEvent) => {
    const context = canvasRef.current!.getContext("2d")!;

    array(event).forEach(point => {
      // if [position] doesn't incluse the identifier -> do not draw
      if (!position.current[point.identifier]) return;

      let refPosition = position.current[point.identifier];
  
      context.globalCompositeOperation = "destination-out";
      context.beginPath();
      context.moveTo(refPosition.x, refPosition.y);
      context.lineTo(point.clientX, point.clientY);
      context.closePath();
      context.stroke();
  
      position.current[point.identifier] = {
        x: point.clientX,
        y: point.clientY,
      };  
    })  
  };

  useEffect(() => {
    imgRef.current?.complete && defineCanvas()
  }, [imgRef])

  const scratchEnd = (event: PointerEvent) => {
    array(event).forEach(({ identifier }) => delete position.current[identifier])}

  return <div ref={ref} style={style}>
    <img style={{ display: 'none' }} src={src} onLoad={defineCanvas} ref={imgRef} className={styles.img} />
    <canvas className={styles.canvas} ref={canvasRef}/>
  </div>;
});

const array = ({ mouse, touch }: PointerEvent) => (touch ? Array.from(touch?.changedTouches) 
  : [{ clientX: mouse!.clientX, clientY: mouse!.clientY, identifier: '#' }]);