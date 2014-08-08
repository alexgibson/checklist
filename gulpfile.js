var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var minifyCSS = require('gulp-minify-css');
var manifest = require('gulp-manifest');

var paths = {
  scripts: ['src/js/*.js'],
  styles: ['src/css/*.css']
};

gulp.task('scripts', function() {
    gulp.src([
        'src/js/jquery-min.js',
        'src/js/underscore-min.js',
        'src/js/backbone-min.js',
        'src/js/backbone.localstorage-min.js',
        'src/js/tap.js',
        'src/js/main.js'
        ])
        .pipe(concat('app.js'))
        .pipe(uglify({'preserveComments': 'all'}))
        .pipe(gulp.dest('dist/js/'));
});

gulp.task('styles', function() {
    gulp.src([
        'src/css/normalize.css',
        'src/css/styles.css'
        ])
        .pipe(concat('styles.css'))
        .pipe(minifyCSS())
        .pipe(gulp.dest('dist/css/'));
});

gulp.task('manifest', function() {
    gulp.src(['dist/**/*'])
        .pipe(manifest({
            timestamp: true,
            filename: 'web.appcache',
            exclude: 'web.appcache'
        }))
        .pipe(gulp.dest('./'));
});

gulp.task('watch', function() {
    gulp.watch(paths.scripts, ['scripts']);
    gulp.watch(paths.styles, ['styles', 'manifest']);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['watch']);
