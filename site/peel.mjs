function clip(points, nx, ny, crease, keepGreater) {
  const result = [];
  const signed = ([x,y]) => (nx*x+ny*y-crease)*(keepGreater ? 1 : -1);
  for(let i=0;i<points.length;i++) {
    const a=points[i], b=points[(i+1)%points.length];
    const da=signed(a), db=signed(b);
    if(da>=0) result.push(a);
    if((da>=0)!==(db>=0)) {
      const t=da/(da-db);
      result.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
    }
  }
  return result;
}
export function peelGeometry(width,height,dx,dy) {
  const distance=Math.hypot(dx,dy);
  const rectangle=[[0,0],[width,0],[width,height],[0,height]];
  if(!distance) return {progress:0,cover:rectangle,fold:[],angle:0};
  const nx=dx/distance, ny=dy/distance;
  const projections=rectangle.map(([x,y])=>nx*x+ny*y);
  const min=Math.min(...projections), max=Math.max(...projections);
  const progress=Math.min(1,distance/(max-min));
  const crease=min+(max-min)*progress;
  const cover=clip(rectangle,nx,ny,crease,true);
  const fold=clip(rectangle,nx,ny,crease,false).map(([x,y])=>{
    const reflection=2*(crease-nx*x-ny*y);
    return [x+nx*reflection,y+ny*reflection];
  });
  return {progress,cover,fold,angle:Math.atan2(ny,nx)*180/Math.PI};
}
export function polygonCSS(points,width,height) {
  return points.length>2 ? `polygon(${points.map(([x,y])=>`${x/width*100}% ${y/height*100}%`).join(',')})` : 'polygon(0 0,0 0,0 0)';
}
