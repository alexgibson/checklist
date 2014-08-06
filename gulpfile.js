var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var minifyCSS = require('gulp-minify-css');

gulp.task('default', function() {
    gulp.src([
        './src/js/jquery-min.js',
        './src/js/underscore-min.js',
        './src/js/backbone-min.js',
        './src/js/backbone.localstorage-min.js',
        './src/js/tap.js',
        './src/js/main.js'
        ])
        .pipe(concat('app.js'))
        .pipe(uglify({'preserveComments': 'all'}))
        .pipe(gulp.dest('./dist/js/'));

    gulp.src([
        './src/css/normalize.css',
        './src/css/styles.css'
        ])
        .pipe(concat('styles.css'))
        .pipe(minifyCSS())
        .pipe(gulp.dest('./dist/css/'));
});
