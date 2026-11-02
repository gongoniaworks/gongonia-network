import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryProjectDirectory = path.resolve(appDirectory, '..');
const outputDirectory = path.join(appDirectory, 'dist');

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(path.join(outputDirectory, 'src'), { recursive: true });
await mkdir(path.join(outputDirectory, 'engine', 'src'), { recursive: true });

await copyFile(path.join(appDirectory, 'index.html'), path.join(outputDirectory, 'index.html'));
await copyFile(path.join(appDirectory, 'styles.css'), path.join(outputDirectory, 'styles.css'));
await copyFile(path.join(appDirectory, '_headers'), path.join(outputDirectory, '_headers'));

const sourceMain = await readFile(path.join(appDirectory, 'src', 'main.js'), 'utf8');
const sourceImport = '../../engine/src/bingo-engine.js';
const deploymentImport = '../engine/src/bingo-engine.js';
if (!sourceMain.includes(sourceImport)) {
  throw new Error('No se encontró la ruta de importación esperada del motor en src/main.js.');
}
const deploymentMain = sourceMain.replace(sourceImport, deploymentImport);
await writeFile(path.join(outputDirectory, 'src', 'main.js'), deploymentMain, 'utf8');

await copyFile(
  path.join(repositoryProjectDirectory, 'engine', 'src', 'bingo-engine.js'),
  path.join(outputDirectory, 'engine', 'src', 'bingo-engine.js'),
);

console.log('Build completado: interfaz y motor copiados a app/dist/.');
