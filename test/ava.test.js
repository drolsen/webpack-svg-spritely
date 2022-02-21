const test = require('ava');
const fs = require('fs');
const path = require('path');
 
test('basic', t => {
  let pass = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/basic/main.js'), 'utf8');
  if (testData.toString().indexOf('Invalid SVG Response') !== -1) { // "Invalid SVG Response" can be found in minified/un-minfied source
    pass = true;
  }

  if (pass) {
    t.pass();
  } else {
    t.fail();
  }
});

test('manifest', t => {
  const pass = fs.readFileSync(path.resolve(__dirname, '../dist/manifest/icon-manifest.json'), 'utf8');  

  if (pass) {
    t.pass();
  } else {
    t.fail();
  }
});

test('entry-html', t => {
  let pass = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/entry-html/index.b.html'), 'utf8');

  if (testData.toString().indexOf('Invalid SVG Response') !== -1) {
    pass = true;
  }

  if (pass) {
    t.pass();
  } else {
    t.fail();
  }
});

test('entry-js', t => {
  let pass = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/entry-js/testB.js'), 'utf8');
  
  if (testData.toString().indexOf('Invalid SVG Response') !== -1) { // "Invalid SVG Response" can be found in minified/un-minfied source
    pass = true;
  }

  if (pass) {
    t.pass();
  } else {
    t.fail();
  }
});

test('entry-multi-js', t => {
  let passes = true;
  const testDataA = fs.readFileSync(path.resolve(__dirname, '../dist/entry-js-multi/testA.js'), 'utf8');
  const testDataB = fs.readFileSync(path.resolve(__dirname, '../dist/entry-js-multi/testB.js'), 'utf8');
  const testDataC = fs.readFileSync(path.resolve(__dirname, '../dist/entry-js-multi/index.b.html'), 'utf8');
  
  if (testDataA.toString().indexOf('Invalid SVG Response') === -1) { // "Invalid SVG Response" can be found in minified/un-minfied source
    passes = false;
  }

  if (testDataB.toString().indexOf('Invalid SVG Response') === -1) { // "Invalid SVG Response" can be found in minified/un-minfied source
    passes = false;
  }

  if (testDataB.toString().indexOf('Invalid SVG Response') === -1) { // "Invalid SVG Response" can be found in minified/un-minfied source
    passes = false;
  }   

  if (passes) {
    t.pass();
  } else {
    t.fail();
  }
});

test('filename', t => {
  let pass = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/filename/testA.js'), 'utf8');
  
  if (testData.toString().indexOf('custom-') !== -1) {
    pass = true;
  }

  if (pass) {
    t.pass();
  } else {
    t.fail();
  }
});

test('filter', t => {
  let pass = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/filtering/images/iconset.svg'), 'utf8');
  
  if (
    testData.toString().indexOf('icon-left') === -1
    && testData.toString().indexOf('icon-right') === -1
  ) {
    pass = true;
  }

  if (pass) {
    t.pass();
  } else {
    t.fail();
  }
});

test('insert-bundle', t => {
  let pass = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/insert-bundle/testA.js'), 'utf8');
  
  if (testData.toString().indexOf('WP_SVG_DIV') !== -1) {
    pass = true;
  }

  if (pass) {
    t.pass();
  } else {
    t.fail();
  }
});

test('insert-none', t => {
  let pass = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/insert-none/testA.js'), 'utf8');
  
  if (testData.toString().indexOf('Invalid SVG Response') === -1) { // "Invalid SVG Response" can be found in minified/un-minfied source
    pass = true;
  }

  if (pass) {
    t.pass();
  } else {
    t.fail();
  }
});

test('insert-xhr', t => {
  let pass = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/insert-xhr/testA.js'), 'utf8');
  
  if (testData.toString().indexOf('Invalid SVG Response') !== -1) { // "Invalid SVG Response" can be found in minified/un-minfied source
    pass = true;
  }

  if (pass) {
    t.pass();
  } else {
    t.fail();
  }
});


test('location-bodyStart', t => {
  let pass = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/location-body-start/testA.js'), 'utf8');
  
  if (testData.toString().indexOf('document.body.insertBefore') !== -1) { // "Invalid SVG Response" can be found in minified/un-minfied source
    pass = true;
  }

  if (pass) {
    t.pass();
  } else {
    t.fail();
  }
});

test('location-bodyEnd', t => {
  let pass = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/location-body-end/testA.js'), 'utf8');
  
  if (testData.toString().indexOf('document.body.append') !== -1) { // "Invalid SVG Response" can be found in minified/un-minfied source
    pass = true;
  }

  if (pass) {
    t.pass();
  } else {
    t.fail();
  }
});


test('path', t => {
  let pass = false;
  const testData = fs.readFileSync(path.resolve(__dirname, '../dist/path/testA.js'), 'utf8');

  if (testData.toString().indexOf('/~/custom/path/to/svg') !== -1) {
    pass = true;
  }

  if (pass) {
    t.pass();
  } else {
    t.fail();
  }
});