import * as THREE from 'three';

export function exportSculptureToSTL(mesh: THREE.Mesh, fileName: string = 'thought_sculptor_artifact.stl'): void {
  const geometry = mesh.geometry.clone();
  geometry.applyMatrix4(mesh.matrixWorld);

  const index = geometry.index;
  const position = geometry.attributes.position;

  let stlString = 'solid ThoughtSculptorArtifact\n';

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const normal = new THREE.Vector3();

  const writeFacet = (a: number, b: number, c: number) => {
    vA.fromBufferAttribute(position, a);
    vB.fromBufferAttribute(position, b);
    vC.fromBufferAttribute(position, c);

    cb.subVectors(vC, vB);
    ab.subVectors(vA, vB);
    cb.cross(ab).normalize();
    normal.copy(cb);

    stlString += `  facet normal ${normal.x.toFixed(6)} ${normal.y.toFixed(6)} ${normal.z.toFixed(6)}\n`;
    stlString += '    outer loop\n';
    stlString += `      vertex ${vA.x.toFixed(6)} ${vA.y.toFixed(6)} ${vA.z.toFixed(6)}\n`;
    stlString += `      vertex ${vB.x.toFixed(6)} ${vB.y.toFixed(6)} ${vB.z.toFixed(6)}\n`;
    stlString += `      vertex ${vC.x.toFixed(6)} ${vC.y.toFixed(6)} ${vC.z.toFixed(6)}\n`;
    stlString += '    endloop\n';
    stlString += '  endfacet\n';
  };

  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      writeFacet(index.getX(i), index.getX(i + 1), index.getX(i + 2));
    }
  } else {
    for (let i = 0; i < position.count; i += 3) {
      writeFacet(i, i + 1, i + 2);
    }
  }

  stlString += 'endsolid ThoughtSculptorArtifact\n';

  const blob = new Blob([stlString], { type: 'application/sla' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}
