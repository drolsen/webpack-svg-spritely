import test from 'ava';
import fs from 'fs';
import path from 'path';
 
test('basic', t => {
  let insert = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/basic/main.js'), 'utf8');
  if (testData.toString().indexOf('WP_SVG_XHR') !== -1) {
    insert = true;
  }

  if (insert) {
    t.pass();
  } else {
    t.fail();
  }
});

test('entry-html', t => {
  let insert = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/entry-html/test.b.html'), 'utf8');
  
  if (testData.toString().indexOf('<symbol id="icon-down"') !== -1) {
    insert = true;
  }

  if (insert) {
    t.pass();
  } else {
    t.fail();
  }
});


test('entry-js', t => {
  let insert = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/entry-js/testB.js'), 'utf8');
  
  if (testData.toString().indexOf('WP_SVG_XHR') !== -1) {
    insert = true;
  }

  if (insert) {
    t.pass();
  } else {
    t.fail();
  }
});

test('filename', t => {
  let insert = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/filename/testA.js'), 'utf8');
  
  if (testData.toString().indexOf('custom-') !== -1) {
    insert = true;
  }

  if (insert) {
    t.pass();
  } else {
    t.fail();
  }
});

test('insert-bundle', t => {
  let insert = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/insert-bundle/testA.js'), 'utf8');
  
  if (testData.toString().indexOf('WP_SVG_DIV') !== -1) {
    insert = true;
  }

  if (insert) {
    t.pass();
  } else {
    t.fail();
  }
});

test('insert-document', t => {
  let insert = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/insert-document/index.a.html'), 'utf8');
  
  if (testData.toString().indexOf('<symbol') !== -1) {
    insert = true;
  }

  if (insert) {
    t.pass();
  } else {
    t.fail();
  }
});

test('insert-none', t => {
  let insert = true;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/insert-none/testA.js'), 'utf8');
  
  if (testData.toString().indexOf('WP_SVG_DIV') === -1
    && testData.toString().indexOf('WP_SVG_XHR') === -1) {
    insert = false;
  }

  if (!insert) {
    t.pass();
  } else {
    t.fail();
  }
});

test('insert-xhr', t => {
  let insert = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/insert-xhr/testA.js'), 'utf8');
  
  if (testData.toString().indexOf('WP_SVG_XHR') !== -1) {
    insert = true;
  }

  if (insert) {
    t.pass();
  } else {
    t.fail();
  }
});


test('minification', t => {
  let insert = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/minification/testA.js'), 'utf8');
  
  if (testData.toString().indexOf('iconset-') !== -1) {
    insert = true;
  }

  if (insert) {
    t.pass();
  } else {
    t.fail();
  }
});

test('path', t => {
  let insert = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/path/testA.js'), 'utf8');
  
  if (testData.toString().indexOf('/~/custom/path/to/svg/') !== -1) {
    insert = true;
  }

  if (insert) {
    t.pass();
  } else {
    t.fail();
  }
});