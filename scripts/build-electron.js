const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando build da aplicação Electron...');

try {
  // 1. Limpar diretórios de build anteriores
  console.log('🧹 Limpando builds anteriores...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  if (fs.existsSync('dist-electron')) {
    fs.rmSync('dist-electron', { recursive: true, force: true });
  }

  // 2. Build do frontend (Vite)
  console.log('⚡ Fazendo build do frontend com Vite...');
  execSync('npm run build', { stdio: 'inherit' });

  // 3. Criar diretório dist-electron
  console.log('📁 Criando diretório dist-electron...');
  fs.mkdirSync('dist-electron', { recursive: true });

  // 4. Copiar arquivos do Electron
  console.log('📋 Copiando arquivos do Electron...');
  fs.copyFileSync('main.js', 'dist-electron/main.js');
  fs.copyFileSync('preload.js', 'dist-electron/preload.js');

  // 5. Criar package.json simplificado para produção
  console.log('📦 Criando package.json para produção...');
  const originalPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const productionPackage = {
    name: originalPackage.name,
    version: originalPackage.version,
    description: originalPackage.description,
    main: 'main.js',
    author: originalPackage.author,
    license: originalPackage.license,
    dependencies: {
      // Apenas dependências necessárias para produção
      electron: originalPackage.devDependencies.electron
    }
  };
  
  fs.writeFileSync(
    'dist-electron/package.json', 
    JSON.stringify(productionPackage, null, 2)
  );

  console.log('✅ Build concluído com sucesso!');
  console.log('📂 Arquivos gerados:');
  console.log('   - dist/ (frontend)');
  console.log('   - dist-electron/ (Electron)');
  console.log('');
  console.log('🎯 Para testar a aplicação:');
  console.log('   npm run electron');
  console.log('');
  console.log('📦 Para gerar instaladores:');
  console.log('   npm run dist');

} catch (error) {
  console.error('❌ Erro durante o build:', error.message);
  process.exit(1);
}