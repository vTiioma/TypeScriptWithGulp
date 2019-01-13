const gulp = require('gulp'); // to do all gulp things
const gulpif = require('gulp-if'); // to have if-then functionality with our gulp project
const merge = require('merge-stream'); // to merge multiple gulp tasts into one
const maps = require('gulp-sourcemaps'); // to build our TypeScript source map files
const ts = require('gulp-typescript'); // to transpile our TypeScript into Javascript
const tslint = require('gulp-tslint'); // to lint our TypeScript files
const jsonmerge = require('gulp-merge-json'); // to merge JSON files
const jsonminify = require('gulp-jsonminify'); // to drop the size of JSON files
const sass = require('gulp-sass'); // to transpile our scss into css
const imagemin = require('gulp-imagemin'); // to compress images
const uglify = require('gulp-uglify'); // to map our css/js much harder to read
const cachebust = require('gulp-cache-bust'); // to automate cache busting
const del = require('del'); // to delete older builds
const concat = require('gulp-concat'); // to combine multiple files into one small file
const rename = require('gulp-rename'); // can be used to rename files but we will only be using this to remove folder structure
const browserSync = require('browser-sync').create(); // to auto push our build to our web browser for testing
const history = require('connect-history-api-fallback'); // middleware for browser-sync to relaunch us on index.html

const tsProject = ts.createProject('tsconfig.json'); // creates an instance of a TypeScript project using rules set in the tsconfig.json

const scripts = require('./scripts'); // list of vendor javascript
const styles = require('./styles'); // list of vendor css

// build paths
const paths = {
  get dest() { return devMode === false ? './dist' : './test'; }, // folder for project to build to (./test if in dev mode and ./dist if in dist mode)
  get css() { return this.dest+'/css'; }, // folder for our css to build out to
  get js() { return this.dest+'/js'; }, // folder for our js (and ts map files) to build out to
  get json() { return this.dest+'/json'; }, // folder for our json to build out to
  get images() { return this.dest+'/img'; }, // folder to copy our images into
  get fonts() { return this.dest+'/fonts'; }, // folder to copy our font files into
  get video() { return this.dest+'/video'; } // folder to copy our videos over to
}

let devMode = false; // check if we are in dev or dist mode

// build out our vendor js and css
function vendor() {
    // collection of vender tasks
    let vendors = [
        // css
        gulp.src(styles) // get our collection of vendor css
            .pipe(concat('vendor.css')) // merge that all into a single css file
            .pipe(sass({ outputStyle: devMode === false ? 'compressed' : 'expanded' }).on('error', sass.logError)) // compress down for dist mode to save on memory
            .pipe(gulp.dest(paths.css)), // build out to our css build location
        // js
        gulp.src(scripts) // get our collection of vendor js
            .pipe(concat('vendor.js')) // merge that all into a single js file
            .pipe(gulpif(devMode === false, uglify({ mangle:false }))) // make slightly harder to read if in dist mode
            .pipe(gulp.dest(paths.js)) // build out to our js build location
    ];
    return merge(vendors); // merge down both individual vender tasks into one gulp task
}

// copy over, and possibly compress, images
function images() {
    return gulp.src(['./src/**/**/*.+(png|jpg|gif|svg)', './src/**/*.+(png|jpg|gif|svg)']) // get any and all image files we can think of
        .pipe(gulpif(devMode === false, imagemin([ // apply compression if we are in dist mode
            imagemin.gifsicle({ interlaced: true }),
            imagemin.jpegtran({ progressive: true }),
            imagemin.optipng({ optimizationLevel: 7 }),
            imagemin.svgo({ plugins: [{ removeViewBox: true }]})
          ], { verbose: true })))
        .pipe(rename({dirname: ''})) // remove any folder structure
        .pipe(gulp.dest(paths.images)) // build out to our target destination
}

// copy over video files
function video() {
    return gulp.src(['./src/**/**/*.mp4', './src/**/*.mp4']) // look for any .mp4 files
        .pipe(rename({dirname: ''})) // remove any folder structure
        .pipe(gulp.dest(paths.video)) // copy them over to our target destination
        .pipe(browserSync.reload({ stream: true })); // reload the web browser window if browser-sync is running
}

// copy over font files
function fonts() {
    return gulp.src(['./src/**/**/*.woff', './src/**/*.woff']) // look for any .woff font files (only .woff files can be referenced from css for some reason)
        .pipe(rename({dirname: ''})) // remove any folder structure
        .pipe(gulp.dest(paths.fonts)) // copy them over to our target destination
        .pipe(browserSync.reload({ stream: true })); // reload the web browser window if browser-sync is running
}

// merge and minify json
function json() {
    return gulp.src(['./src/**/**/*.json', './src/**/*.json', './src/*.json']) // look for any json files
        .pipe(jsonmerge({ fileName: 'main.json' })) // merge them all down to one json package
        .pipe(gulpif(devMode === false, jsonminify())) // minify the json package if we're in dist mode
        .pipe(gulp.dest(paths.json)) // build out the unified json package to our target destination
        .pipe(browserSync.reload({ stream: true })); // reload the web browser window if browser-sync is running
}

// transpile scss over to css and minify
function css() {
    return gulp.src(['./src/**/**/*.scss', './src/**/*.scss']) // look for any scss files
        .pipe(concat('main.css')) // merge them all down into one css file
        .pipe(sass({ outputStyle: devMode === false ? 'compressed' : 'expanded' }).on('error', sass.logError)) // if we're in dist mode them compress the css file
        .pipe(gulp.dest(paths.css)) // build our merged css file out to our target destination
        .pipe(browserSync.reload({ stream: true })); // reload the web browser window if browser-sync is running
}

// proof-read out TypeScript code
function lint() {
    return gulp.src(['./src/ts/**/*.ts', './src/ts/*.ts']) // get a list of all our TypeScript files
        .pipe(tslint({ formatter: 'prose' })) // check for any errors (rules found in tsline.json)
        .pipe(tslint.report( { emitError: false })); // report out all errors found
}

// transpile TypeScript into Javascript
function typescript() {
    // collection of all TypeScript
    let sourceFiles = [
        './node_modules/@types/**/*d.ts',
        './src/typings/**/*.d.ts',
        './src/typings/*.d.ts',
        './src/ts/**/*.ts',
        './src/ts/*.ts'
    ];

    let result = gulp
        .src(sourceFiles) // take our collection of TypeScript
        .pipe(gulpif(devMode === true, maps.init())) // generate map files if in dev mode only
        .pipe(tsProject()); // push through to our TypeScript project for transpiling
    
    return result.js // take output Javascript from the transpiled TypeScript project
        .pipe(concat('main.js')) // concat all the output Javascript files into one file
        .pipe(maps.write('.')) // write out map files without adding in new directories
        .pipe(gulpif(devMode === false, uglify({ mangle:false }))) // make slightly harder to read if in dist mode
        .pipe(gulp.dest(paths.js)) // build out files to our target destination
        .pipe(browserSync.reload({ stream: true })); // reload the browser window if browser-sync is running
}

// copy over html file and add cache-busting
function html() {
    return gulp.src(['./src/**/*.html', './src/*.html']) // get our collection of html files
        .pipe(cachebust({ type: 'timestamp' })) // apply cache busting
        .pipe(gulp.dest(paths.dest)) // rebuild to target destination
        .pipe(browserSync.reload({ stream: true })); // reload the browser window if browser-sync is running
}

// remove old version of the build
function clean() {
    return del(paths.dest); // remove any old versions of our target build folder
}

// initialize our live-demo browser
function browsersync() {
    return browserSync.init({
        open: "external", // select what kind of url the browser will initialize to ("external" uses your URL device)
        server: { baseDir: paths.dest, middleware: [history()] } // give destination host path and any middleware
    });
}

// watch (and update) files for any changes
function watch() {
    gulp.watch(['./src/ts/**/*.ts','./src/ts/*.ts'], gulp.series(lint, typescript)); // check for TypeScript changes
    gulp.watch(['./src/typings/**/*.d.ts','./src/typings/*.d.ts'], typescript); // check for TypeScript map file changes
    gulp.watch(['./src/*.html', './src/**/*.html'], html); // check for HTML changes
}


// no lie- copied this part out of a tutorial
// and not super sure what it's here for
exports.vendor = vendor;
exports.images = images;
exports.video = video;
exports.fonts = fonts;
exports.json = json;
exports.css = css;
exports.lint = lint;
exports.typescript = typescript;
exports.html = html;
exports.clean = clean;
exports.browsersync = browsersync;
exports.watch = watch;


// put all of our predetermined functions as gulp tasks
gulp.task('vendor', vendor);
gulp.task('video', video);
gulp.task('images', images);
gulp.task('fonts', fonts);
gulp.task('json', json);
gulp.task('css', css);
gulp.task('html', html);
gulp.task('lint', lint);
gulp.task('ts', typescript);
gulp.task('clean', clean);
gulp.task('browser-sync', browsersync);
gulp.task('watch', watch);

// defining build function array
// series runs one after the other
// parallel runs all at once
// so first clean, then build, then host browser-sync
const build = gulp.series('clean', 
    gulp.parallel('vendor', 
    'video', 'images', 'fonts', 'json',
    'lint', 'ts', 'css', 'html', 'watch',
    function(){
                console.log(' -------------------------------------');
                console.log(' Build Type: ' + (devMode === true ? 'DEV' : 'PROD'));
                console.log(' -------------------------------------');
                if(devMode === true) {
                    console.log(' * Least Efficient');
                    console.log(' * Uncompressed files');
                    console.log(' * Longer load times');
                } else {
                    console.log(' * Most Efficient');
                    console.log(' * Compressed files');
                    console.log(' * Shorter load times');
                }
                console.log(' -------------------------------------');
            },
    'browser-sync'));


// run 'gulp build' for dist
gulp.task('build', build);

// run 'gulp' for dev
gulp.task('default', function() {
    devMode = true;
    build();
});