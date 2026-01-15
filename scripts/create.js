#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templateRoot = path.resolve(__dirname, '..');

const TYPE_OPTIONS = ['newtab', 'history', 'bookmarks'];
const PAGE_META = {
  newtab: {
    label: 'newtab',
    desc: '新标签页',
    html: 'src/newtab.html',
    entry: 'src/newtab/index.tsx',
    permission: null,
  },
  history: {
    label: 'history',
    desc: '历史记录页',
    html: 'src/history.html',
    entry: 'src/history/index.tsx',
    permission: 'history',
  },
  bookmarks: {
    label: 'bookmarks',
    desc: '书签页',
    html: 'src/bookmarks.html',
    entry: 'src/bookmarks/index.tsx',
    permission: 'bookmarks',
  },
};
const PRUNE_PATHS = {
  newtab: ['src/newtab.html', 'src/newtab', 'src/components/NewTabContent'],
  history: ['src/history.html', 'src/history', 'src/components/HistoryContent'],
  bookmarks: [
    'src/bookmarks.html',
    'src/bookmarks',
    'src/components/BookmarksContent',
  ],
};
const STYLE_PATTERNS = {
  newtab: [
    /\/\* NewTab 特定全局样式 \*\/[\s\S]*?}\r?\n\r?\n?/,
    /\/\* 亮色主题背景渐变 \*\/[\s\S]*?body\.newtab[\s\S]*?}\r?\n\r?\n?/,
    /\/\* 暗色主题背景渐变 \*\/[\s\S]*?body\.newtab[\s\S]*?}\r?\n\r?\n?/,
  ],
  history: [
    /\/\* History 特定全局样式 \*\/[\s\S]*?}\r?\n\r?\n?/,
    /\/\* 亮色主题背景渐变 \*\/[\s\S]*?body\.history[\s\S]*?}\r?\n\r?\n?/,
    /\/\* 暗色主题背景渐变 \*\/[\s\S]*?body\.history[\s\S]*?}\r?\n\r?\n?/,
  ],
  bookmarks: [
    /\/\* Bookmarks 特定全局样式 \*\/[\s\S]*?}\r?\n\r?\n?/,
    /\/\* 亮色主题背景渐变 \*\/[\s\S]*?body\.bookmarks[\s\S]*?}\r?\n\r?\n?/,
    /\/\* 暗色主题背景渐变 \*\/[\s\S]*?body\.bookmarks[\s\S]*?}\r?\n\r?\n?/,
  ],
};

const getOptionValue = (args, keys) => {
  const index = args.findIndex((arg) => keys.includes(arg));
  if (index === -1) return null;
  return args[index + 1] ?? null;
};

const promptType = async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (text) =>
    new Promise((resolve) => {
      rl.question(text, resolve);
    });

  if (!process.stdin.isTTY) {
    rl.close();
    return 'newtab';
  }

  readline.emitKeypressEvents(process.stdin, rl);
  process.stdin.setRawMode(true);

  let selectedIndex = Math.max(TYPE_OPTIONS.indexOf('newtab'), 0);
  const render = () => {
    process.stdout.write('\x1b[2J');
    process.stdout.write('\x1b[0f');
    console.log('请选择要创建的扩展类型（↑↓ 选择，Enter 确认）：');
    TYPE_OPTIONS.forEach((option, index) => {
      const prefix = index === selectedIndex ? '➤' : ' ';
      console.log(`${prefix} ${option}`);
    });
  };

  render();

  const selectedType = await new Promise((resolve) => {
    const cleanup = () => {
      process.stdin.removeListener('keypress', onKeypress);
      process.stdin.removeListener('close', onClose);
      process.stdin.removeListener('end', onClose);
      process.stdin.removeListener('error', onClose);
    };

    const onClose = () => {
      cleanup();
      resolve(null);
    };

    const onKeypress = (_, key) => {
      if (!key) return;
      if (key.name === 'up') {
        selectedIndex =
          (selectedIndex - 1 + TYPE_OPTIONS.length) % TYPE_OPTIONS.length;
        render();
      } else if (key.name === 'down') {
        selectedIndex = (selectedIndex + 1) % TYPE_OPTIONS.length;
        render();
      } else if (key.name === 'return') {
        cleanup();
        resolve(TYPE_OPTIONS[selectedIndex]);
      } else if (key.name === 'c' && key.ctrl) {
        cleanup();
        resolve(null);
      }
    };

    process.stdin.on('keypress', onKeypress);
    process.stdin.once('close', onClose);
    process.stdin.once('end', onClose);
    process.stdin.once('error', onClose);
  });

  process.stdin.setRawMode(false);
  rl.close();

  return selectedType;
};

const ensureEmptyDir = async (targetDir) => {
  try {
    const entries = await fs.readdir(targetDir);
    return entries.length === 0;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      await fs.mkdir(targetDir, { recursive: true });
      return true;
    }
    throw error;
  }
};

const copyDir = async (
  source,
  destination,
  ignore = new Set(),
  ignorePaths = new Set()
) => {
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    if (ignore.has(entry.name)) {
      continue;
    }

    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    if (ignorePaths.has(sourcePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      await copyDir(sourcePath, destPath, ignore, ignorePaths);
    } else if (entry.isFile()) {
      await fs.copyFile(sourcePath, destPath);
    }
  }
};

const removePath = async (targetPath) => {
  try {
    await fs.rm(targetPath, { recursive: true, force: true });
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      throw error;
    }
  }
};

const updateManifest = async (targetDir, type) => {
  const manifestPath = path.join(targetDir, 'src', 'manifest.json');
  const data = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

  data.chrome_url_overrides = {
    [type]: `${type}.html`,
  };

  const permissions = new Set(data.permissions || []);
  permissions.delete('history');
  permissions.delete('bookmarks');
  const permission = PAGE_META[type]?.permission;
  if (permission) {
    permissions.add(permission);
  }
  data.permissions = Array.from(permissions);

  await fs.writeFile(manifestPath, JSON.stringify(data, null, 2));
};

const updateViteConfig = async (targetDir, type) => {
  const vitePath = path.join(targetDir, 'vite.config.ts');
  const content = await fs.readFile(vitePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  const filtered = lines.filter((line) => {
    if (line.includes('newtab: resolve(')) return type === 'newtab';
    if (line.includes('history: resolve(')) return type === 'history';
    if (line.includes('bookmarks: resolve(')) return type === 'bookmarks';
    return true;
  });

  await fs.writeFile(vitePath, filtered.join('\n'));
};

const removePatterns = (content, patterns) =>
  patterns.reduce((acc, pattern) => acc.replace(pattern, ''), content);

const updateStyles = async (targetDir, type) => {
  const stylePath = path.join(targetDir, 'src', 'style.css');
  let content = await fs.readFile(stylePath, 'utf-8');

  const targets = TYPE_OPTIONS.filter((option) => option !== type);
  targets.forEach((option) => {
    content = removePatterns(content, STYLE_PATTERNS[option] || []);
  });

  await fs.writeFile(stylePath, content.trimEnd() + '\n');
};

const updateReadme = async (targetDir, type) => {
  const readmePath = path.join(targetDir, 'README.md');
  let content = await fs.readFile(readmePath, 'utf-8');

  const meta = PAGE_META[type];
  const section = [
    '### 页面覆盖',
    '',
    '项目内置 1 个页面：',
    '',
    `- \`${meta.label}\`：${meta.desc}`,
    '',
    '对应入口文件：',
    '',
    `- \`${meta.html}\` → \`${meta.entry}\``,
    '',
  ].join('\n');

  const sectionRegex = /### 页面覆盖[\s\S]*?(?=\n### |\n## |$)/;
  if (sectionRegex.test(content)) {
    content = content.replace(sectionRegex, section.trim());
  } else {
    content = content.trimEnd() + '\n\n' + section.trim() + '\n';
  }

  await fs.writeFile(readmePath, content.trimEnd() + '\n');
};

const updatePackageJson = async (targetDir, projectName) => {
  const pkgPath = path.join(targetDir, 'package.json');
  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
  pkg.name = projectName;
  if (pkg.bin) {
    delete pkg.bin;
  }
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2));
};

const updatePackageLock = async (targetDir, projectName) => {
  const lockPath = path.join(targetDir, 'package-lock.json');
  try {
    const lock = JSON.parse(await fs.readFile(lockPath, 'utf-8'));
    lock.name = projectName;
    if (lock.packages && lock.packages['']) {
      lock.packages[''].name = projectName;
    }
    await fs.writeFile(lockPath, JSON.stringify(lock, null, 2));
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      throw error;
    }
  }
};

const pruneFiles = async (targetDir, type) => {
  const removals = TYPE_OPTIONS.filter((option) => option !== type)
    .flatMap((option) => PRUNE_PATHS[option] || [])
    .map((item) => removePath(path.join(targetDir, item)));
  await Promise.all(removals);
};

const createProgress = (total) => {
  let current = 0;
  const isTty = Boolean(process.stdout.isTTY);
  const barWidth = 24;

  const render = (label) => {
    if (!isTty) {
      return;
    }
    const percent = Math.min(100, Math.round((current / total) * 100));
    const filled = Math.round((barWidth * percent) / 100);
    const bar = `${'#'.repeat(filled)}${'.'.repeat(barWidth - filled)}`;
    const text = `[${bar}] ${percent}% ${label}`;
    process.stdout.write(`\r${text}`);
  };

  const step = (label) => {
    current += 1;
    render(label);
    if (current >= total && isTty) {
      process.stdout.write('\r\x1b[2K');
    }
  };

  return step;
};

const main = async () => {
  const args = process.argv.slice(2);
  const targetArg = args.find((arg) => !arg.startsWith('-')) || 'extension-app';
  const targetDir = path.resolve(process.cwd(), targetArg);
  const projectName = path.basename(targetDir);
  const typeArg = getOptionValue(args, ['--type', '-t']);
  let selectedType = typeArg && TYPE_OPTIONS.includes(typeArg) ? typeArg : null;

  if (!selectedType) {
    selectedType = await promptType();
  }

  if (!selectedType || !TYPE_OPTIONS.includes(selectedType)) {
    console.log('未选择有效类型，已退出。');
    process.exit(1);
  }

  const empty = await ensureEmptyDir(targetDir);
  if (!empty) {
    console.log(`目录不为空，请选择空目录：${targetDir}`);
    process.exit(1);
  }

  const ignore = new Set([
    'node_modules',
    'dist',
    '.git',
    '.DS_Store',
    'scripts',
  ]);

  const ignorePaths = new Set();
  const relativeTarget = path.relative(templateRoot, targetDir);
  if (
    relativeTarget === '' ||
    (!relativeTarget.startsWith('..') && !path.isAbsolute(relativeTarget))
  ) {
    ignorePaths.add(targetDir);
  }

  const step = createProgress(9);

  step('复制模板');
  await copyDir(templateRoot, targetDir, ignore, ignorePaths);

  step('写入脚本');
  await fs.mkdir(path.join(targetDir, 'scripts'), { recursive: true });
  await fs.copyFile(
    path.join(templateRoot, 'scripts', 'dev.js'),
    path.join(targetDir, 'scripts', 'dev.js')
  );

  step('裁剪文件');
  await pruneFiles(targetDir, selectedType);

  step('更新 manifest');
  await updateManifest(targetDir, selectedType);

  step('更新 Vite 配置');
  await updateViteConfig(targetDir, selectedType);

  step('更新样式');
  await updateStyles(targetDir, selectedType);

  step('更新 README');
  await updateReadme(targetDir, selectedType);

  step('更新 package.json');
  await updatePackageJson(targetDir, projectName);

  step('更新 package-lock.json');
  await updatePackageLock(targetDir, projectName);

  console.log('');
  console.log(`✅ 已创建项目：${targetDir}`);
  console.log(`✅ 选择页面类型：${selectedType}`);
  console.log('');
  console.log('下一步：');
  console.log(`cd ${path.relative(process.cwd(), targetDir)}`);
  console.log('npm install');
  console.log('npm run dev');
};

main().catch((error) => {
  console.error('创建失败：', error);
  process.exit(1);
});
