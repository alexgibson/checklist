var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var minifyCSS = require('gulp-minify-css');

gulp.task('default', function() {
    gulp.src([
        './js/jquery-min.js',
        './js/underscore-min.js',
        './js/backbone-min.js',
        './js/backbone.localstorage-min.js',
        './js/tap.js',
        './js/main.js'
        ])
        .pipe(concat('app.js'))
        .pipe(uglify({'preserveComments': 'all'}))
        .pipe(gulp.dest('./dist/js/'));

    gulp.src([
        './css/normalize.css',
        './css/styles.css'
        ])
        .pipe(concat('styles.css'))
        .pipe(minifyCSS())
        .pipe(gulp.dest('./dist/css/'));
});
