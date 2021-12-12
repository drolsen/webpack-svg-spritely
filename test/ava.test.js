const test = require('ava');
const fs = require('fs');
const path = require('path');
 
test('basic', t => {
  let insert = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/basic/main.js'), 'utf8');
  if (testData.toString().indexOf('Invalid SVG Response') !== -1) { // "Invalid SVG Response" can be found in minified/un-minfied source
    insert = true;
  }

  if (insert) {
    t.pass();
  } else {
    t.fail();
  }
});

test('manifest', t => {
  let manifest = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/manifest/icon-manifest.json'), 'utf8');  

  if (testData) {
    t.pass();
  } else {
    t.fail();
  }
});

test('entry-html', t => {
  let insert = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/entry-html/index.b.html'), 'utf8');

  if (testData.toString().indexOf('Invalid SVG Response') !== -1) {
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
  
  if (testData.toString().indexOf('Invalid SVG Response') !== -1) { // "Invalid SVG Response" can be found in minified/un-minfied source
    insert = true;
  }

  if (insert) {
    t.pass();
  } else {
    t.fail();
  }
});

test('entry-multi-js', t => {
  let passes = false;
  const testDataA = fs.readFileSync(path.resolve(__dirname, '../dist/entry-js/testA.js'), 'utf8');
  const testDataB = fs.readFileSync(path.resolve(__dirname, '../dist/entry-js/testB.js'), 'utf8');
  
  if (testDataA.toString().indexOf('Invalid SVG Response') !== -1) { // "Invalid SVG Response" can be found in minified/un-minfied source
    passes = true;
  }

  if (testDataB.toString().indexOf('Invalid SVG Response') !== -1) { // "Invalid SVG Response" can be found in minified/un-minfied source
    passes = true;
  }  

  if (passes) {
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

test('filter', t => {
  let insert = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/filtering/images/iconset.svg'), 'utf8');
  
  if (
    testData.toString().indexOf('icon-left') === -1
    && testData.toString().indexOf('icon-right') === -1
  ) {
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

test('insert-none', t => {
  let insert = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/insert-none/testA.js'), 'utf8');
  
  if (testData.toString().indexOf('Invalid SVG Response') !== -1) { // "Invalid SVG Response" can be found in minified/un-minfied source
    insert = true;
  }

  if (insert) {
    t.pass();
  } else {
    t.fail();
  }
});

test('insert-xhr', t => {
  let insert = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/insert-xhr/testA.js'), 'utf8');
  
  if (testData.toString().indexOf('Invalid SVG Response') !== -1) { // "Invalid SVG Response" can be found in minified/un-minfied source
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

  if (testData.toString().indexOf('/~/custom/path/to/svg') !== -1) {
    insert = true;
  }

  if (insert) {
    t.pass();
  } else {
    t.fail();
  }
});