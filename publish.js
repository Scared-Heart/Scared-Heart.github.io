#!/usr/bin/env node
/**
 * Simple blog publish script for Scared-Heart.github.io
 * Converts markdown to HTML and updates index/archive pages.
 *
 * Usage: node publish.js <markdown-file> [--slug <slug>] [--date <YYYY-MM-DD>]
 *
 * The markdown file should have:
 *   - First `# ` line as the title
 *   - First `> ` blockquote as the description
 *   - A "日期：YYYY-MM-DD" line in the footer metadata
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT = __dirname;

// --- Parse CLI args ---
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node publish.js <markdown-file> [--slug <slug>] [--date YYYY-MM-DD]');
  process.exit(1);
}

const mdFile = args[0];
let slugOverride = null;
let dateOverride = null;

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--slug' && args[i + 1]) slugOverride = args[++i];
  if (args[i] === '--date' && args[i + 1]) dateOverride = args[++i];
}

// --- Read and parse markdown ---
const mdContent = fs.readFileSync(mdFile, 'utf-8');
const lines = mdContent.split('\n');

// Extract title from first # heading
const titleLine = lines.find(l => /^# /.test(l));
const title = titleLine ? titleLine.replace(/^# /, '').trim() : 'Untitled';

// Extract description from first blockquote
const descLine = lines.find(l => /^> /.test(l));
const description = descLine ? descLine.replace(/^> /, '').trim() : '';

// Extract date from "日期：YYYY-MM-DD" or "**事件时间**: ..."
let date = dateOverride;
if (!date) {
  const dateLine = lines.find(l => /日期[：:]\s*\d{4}-\d{2}-\d{2}/.test(l));
  if (dateLine) {
    const m = dateLine.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) date = m[1];
  }
}
if (!date) {
  // Fallback: today
  date = new Date().toISOString().slice(0, 10);
}

// Derive slug from filename
const slug = slugOverride || path.basename(mdFile, '.md').replace(/^blog_/, '');

console.log(`Title:       ${title}`);
console.log(`Date:        ${date}`);
console.log(`Slug:        ${slug}`);
console.log(`Description: ${description.slice(0, 60)}...`);

// --- Convert markdown to HTML ---
// Strip the title line (we put it in the header) and the footer metadata
let bodyMd = mdContent;
// Remove the title line
bodyMd = bodyMd.replace(/^# .+\n*/, '');
// Remove the footer metadata block (from **文章信息** or **相关文章** to end)
bodyMd = bodyMd.replace(/\n---\n\n\*\*文章信息\*\*[\s\S]*$/, '');

// Fix relative .md links to proper site URLs
bodyMd = bodyMd.replace(/\(\.\/blog_([^)]+)\.md\)/g, (match, name) => `(/${name}/)`);
bodyMd = bodyMd.replace(/\(\.\/([^)]+)\.md\)/g, (match, name) => `(/${name}/)`);

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: false,
});

const bodyHtml = marked.parse(bodyMd);

// --- Generate post page ---
const postHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>

<!--Description-->


    <meta name="description" content="${escapeAttr(description)}"/>


<!--Author-->

    <meta name="author" content="breeze chan"/>


<!--Open Graph Title-->

    <meta property="og:title" content="${escapeAttr(title)}"/>


<!--Open Graph Description-->

    <meta property="og:description" content="${escapeAttr(description)}"/>


<!--Open Graph Site Name-->
    <meta property="og:site_name" content="apple pie"/>

<!--Type page-->

    <meta property="og:type" content="article"/>


<!--Page Cover-->


    <meta property="og:image" content="https://scared-heart.github.io/img/banner.jpg"/>


<meta name="twitter:card" content="summary_large_image"/>




    <meta name="twitter:image" content="https://scared-heart.github.io/img/banner.jpg"/>


<!-- Title -->

<title>${escapeHtml(title)} | apple pie</title>

<!-- Bootstrap Core CSS -->
<link rel="stylesheet" href="//cdn.jsdelivr.net/npm/bootstrap@4.4.1/dist/css/bootstrap.min.css">

<!-- Custom CSS -->

<link rel="stylesheet" href="/css/main.css">


<!-- Custom Fonts -->
<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/5.11.0/css/all.min.css" />
<link href="//fonts.googleapis.com/css?family=Lora:400,700,400italic,700italic" rel="stylesheet" type="text/css"/>
<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/font-awesome/5.11.0/css/all.min.css" />
<link href="//fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@100;300;400;500;700;900&display=swap" rel="stylesheet">
<link href="//fonts.googleapis.com/css?family=Open+Sans:300italic,400italic,600italic,700italic,800italic,400,300,600,700,800" rel="stylesheet" type="text/css"/>

<!-- HTML5 Shim and Respond.js IE8 support of HTML5 elements and media queries -->
<!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
<!--[if lt IE 9]>
<script src="//oss.maxcdn.com/libs/html5shiv/3.7.0/html5shiv.js"></script>
<script src="//oss.maxcdn.com/libs/respond.js/1.4.2/respond.min.js"></script>
<![endif]-->

<!-- Gallery -->
<link rel="stylesheet" href="//cdn.jsdelivr.net/npm/featherlight@1.4.0/src/featherlight.css" integrity="sha256-30DV/STftlyQ6v8yaOWlabammvCYtRJERLj/m0b3zno=" crossorigin="anonymous">
<link rel="stylesheet" href="//cdn.jsdelivr.net/npm/lightgallery@1.6.11/dist/css/lightgallery.min.css">

<!-- favicon -->

<link rel="icon" href="/img/favicon.ico"/>



    <!-- Google Analytics -->


<meta name="generator" content="Hexo 5.2.0"></head>
<!-- Head tag -->

<body>

    <!-- Menu -->
    <!-- Navigation -->
<nav class="navbar navbar-default navbar-custom navbar-fixed-top bg-transparent position-absolute w-100 p-0" id="nav">
    <div class="container pl-0 pr-0">
        <!-- Brand and toggle get grouped for better mobile display -->
        <div class="navbar-header page-scroll">
            <a class="navbar-brand text-white p-1 pl-3" href="/">Breeze Chan</a>
        </div>
        <div class="navbar-nav float-right">
            <button class="btn btn-link search-btn navbar-item" data-toggle="modal" data-target="#searchModal">
                <i class="fas fa-search"></i>
            </button>
        </div>
    </div>
    <!-- /.container -->
</nav>

    <!-- Main Content -->
    <!-- Page Header -->
<!-- Set your background image for this header in your post front-matter: cover -->

<header class="intro-header" style="background-image: url('/img/banner.jpg')">
    <div class="container">
        <div class="row">
            <div class="col-lg-12 col-md-12 text-center">
                <div class="post-heading text-white">
                    <h1>${escapeHtml(title)}</h1>

                </div>
            </div>
        </div>
    </div>
</header>

<!-- Post Content -->
<article>
    <div class="container">
        <div class="row">
            <!-- Post Main Content -->
            <div class="col-lg-8 offset-lg-2 col-md-10 offset-md-1">

                    <span class="meta d-inline-block">


    <!-- Date -->

        <span class="post-meta-split">&nbsp;|&nbsp;</span>
        <i class="far fa-calendar-check fa-fw"></i>
        ${date}

    <!-- word count and read count -->




</span>

${bodyHtml}

            </div>

            <!-- Post information -->


    <div class="col-lg-8 offset-lg-2 col-md-10 offset-md-1">
                <ul class="pagination d-block text-center">
                <li class="next page-item d-inline"><a href="/fnos_rootkit_incident_2026/" class="page-link float-right">上一页  &rarr;</a></li>
            </ul>
    </div>



                <!-- Comments -->






        </div>
    </div>
</article>


    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tocbot/4.4.2/tocbot.css">
    <style>
        #toc-content .toc-link::before {
            background-color: transparent;
            max-height: 25px;
        }

        #toc-content .toc-link.is-active-link::before {
            background-color: #404040;
        }
    </style>
    <script src="//cdnjs.cloudflare.com/ajax/libs/tocbot/4.4.2/tocbot.min.js"></script>
    <div class="ui-toc dropup scrollspy-body pull-right" style="right: 3%;">
        <button type="button" class="toc-btn btn btn-light" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" data-display="static">
            <i class="fas fa-list"></i>
        </button>
        <div class="dropdown-menu dropdown-menu-right p-2"  aria-labelledby="tocLabel">
            <div class="toc-widget">
                <div id="toc-content" class="text-truncate">
                </div>
            </div>
            <div class="toc-menu pt-3 pl-4">
                <a class="expand-toggle d-block py-1" href="#"><span class="expand-text">全部展开</span><span class="close-text" style="display: none;">全部收起</span></a>
                <a class="back-to-top d-block py-1" href="#">回到顶部</a>
                <a class="go-to-bottom d-block py-1" href="#">移至底部</a>
            </div>
        </div>
    </div>
    <script>
        tocbot.init({
            // Where to render the table of contents.
            tocSelector: '#toc-content',
            // Where to grab the headings to build the table of contents.
            contentSelector: 'article',
            // Which headings to grab inside of the contentSelector element.
            headingSelector: 'h1, h2, h3',
            // For headings inside relative or absolute positioned containers within content.
            hasInnerContainers: true,
        });
    </script>





    <!-- Footer -->
    <hr />

<!-- Footer -->
<footer id="footer">
    <div class="container">
        <div class="row">
            <div class="col-lg-8 offset-lg-2 col-md-10 offset-md-1 text-center">
                <ul class="list-inline">





                        <li class="list-inline-item">
                            <a rel="external" href="https://github.com/Scared-Heart" target="_blank">
                                <span class="fa-stack fa-lg">
                                    <i class="fa fa-circle fa-stack-2x"></i>
                                    <i class="fab fa-github fa-stack-1x fa-inverse"></i>
                                </span>
                            </a>
                        </li>







                </ul>
                <ul class="copyright footer-menu list-inline">


                        <li class="list-inline-item">


                            <a href="/">

                                    Home

                            </a>
                        </li>

                        <li class="list-inline-item">

                                <span class="copyright-split">&nbsp;|&nbsp;</span>


                            <a href="/archives">

                                    Archives

                            </a>
                        </li>

                </ul>
                <p class="copyright footer-author">
                    &copy; 2019-2026
                    <a rel="external" class="copyright-link" href="" target="_blank">breeze chan</a><br/>
                    Powered by <a rel="external" class="copyright-link" href="https://hexo.io/" target="_blank">Hexo</a>
                    <span class="copyright-split">&nbsp;|&nbsp;&nbsp;</span>
                    Theme <a rel="external" class="copyright-link" href="https://github.com/luswdev/hexo-theme-clean.git" target="_blank">Clean</a>


                </p>
            </div>
        </div>
    </div>
</footer>


    <!-- After footer scripts -->
    <!-- jQuery -->
<script src="//cdn.jsdelivr.net/npm/jquery@2.1.4/dist/jquery.min.js"></script>

<!-- For drop down -->
<script src="//cdn.jsdelivr.net/npm/popper.js@1.16.0/dist/umd/popper.min.js"></script>

<!-- Bootstrap -->
<script src="//cdn.jsdelivr.net/npm/bootstrap@4.4.1/dist/js/bootstrap.min.js"></script>
<!-- Gallery -->
<script src="//cdn.jsdelivr.net/npm/lightgallery@1.6.11/dist/js/lightgallery-all.min.js"></script>
<!-- Busuanzi -->


<!-- Search script -->

<script src="/js/search.js"></script>

<script type="text/javascript">
    $(function () {
        searchFunc( '/search.xml' , 'searchInput', 'searchResult');
    });
</script>



<script src="/js/main.js"></script>



    <!-- Search Modal -->
    <!-- Modal -->
<div class="modal fade" id="searchModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog modal-dialog-scrollable modal-lg" role="document">
        <div class="modal-content overflow-auto">
            <div class="modal-header">
                <input type="text" class="form-control" placeholder="搜索关键词..." id="searchInput">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div id="searchResult">
                    <div class="search-empty text-center text-muted p-5">
                        <i class="far fa-meh"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>


</body>
</html>`;

// --- Write post file ---
const postDir = path.join(ROOT, slug);
fs.mkdirSync(postDir, { recursive: true });
fs.writeFileSync(path.join(postDir, 'index.html'), postHtml, 'utf-8');
console.log(`\nCreated: ${slug}/index.html`);

// --- Update homepage (index.html) ---
const indexPath = path.join(ROOT, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf-8');

const newPostEntry = `<div class="post-preview post-preview-index">
    <a href="/${slug}/">
        <h2 class="post-title">
            ${escapeHtml(title)}
        </h2>

    </a>
    <p class="post-meta">
        <!-- Date and Author -->

        ${date}
    </p>
</div>
<hr>`;

// Insert after the post-all div opening
const postAllMarker = '<div class="col-lg-8 offset-md-2 col-md-10 offset-md-1 post-all">';
const postAllIdx = indexHtml.indexOf(postAllMarker);
if (postAllIdx !== -1) {
  const insertPos = indexHtml.indexOf('\n', postAllIdx) + 1;
  // Find the first actual post entry or whitespace after the div
  const afterMarker = indexHtml.slice(insertPos);
  const firstPostMatch = afterMarker.match(/\s*(<div class="post-preview|$)/);
  const skipWhitespace = firstPostMatch ? firstPostMatch.index : 0;

  indexHtml = indexHtml.slice(0, insertPos) +
    '            \n                \n                    ' + newPostEntry + '\n\n                \n            \n                ' +
    indexHtml.slice(insertPos);
}

// Update total post count text - not explicitly shown on homepage, skip
fs.writeFileSync(indexPath, indexHtml, 'utf-8');
console.log('Updated: index.html');

// --- Update previous post navigation (fnos_rootkit_incident_2026) ---
const prevPostPath = path.join(ROOT, 'fnos_rootkit_incident_2026', 'index.html');
if (fs.existsSync(prevPostPath)) {
  let prevHtml = fs.readFileSync(prevPostPath, 'utf-8');
  // Add "下一页" link pointing to the new post
  const paginationMarker = '<ul class="pagination d-block text-center">';
  const paginationIdx = prevHtml.indexOf(paginationMarker);
  if (paginationIdx !== -1) {
    const insertAfter = paginationIdx + paginationMarker.length;
    const nextLink = `\n                <li class="prev page-item d-inline"><a href="/${slug}/" class="page-link float-left">&larr; 下一页</a></li>`;
    prevHtml = prevHtml.slice(0, insertAfter) + nextLink + prevHtml.slice(insertAfter);
    fs.writeFileSync(prevPostPath, prevHtml, 'utf-8');
    console.log('Updated: fnos_rootkit_incident_2026/index.html (added next link)');
  }
}

// --- Update archives/index.html ---
const archivesPath = path.join(ROOT, 'archives', 'index.html');
if (fs.existsSync(archivesPath)) {
  let archivesHtml = fs.readFileSync(archivesPath, 'utf-8');

  const archiveEntry = `<div class="post-preview post-preview-archive-archive">
    <a href="/${slug}/">
        <h1 class="post-title">
            ${escapeHtml(title)}
        </h1>
    </a>
    <p class="post-meta">
        <!-- Date and Author -->

        ${date}
    </p>
</div>`;

  // Insert before the first existing post entry
  const firstArchivePost = '<div class="post-preview post-preview-archive-archive">';
  const archiveInsertIdx = archivesHtml.indexOf(firstArchivePost);
  if (archiveInsertIdx !== -1) {
    archivesHtml = archivesHtml.slice(0, archiveInsertIdx) +
      archiveEntry + '\n            \n                ' +
      archivesHtml.slice(archiveInsertIdx);
  }

  // Update post count (badge)
  archivesHtml = archivesHtml.replace(
    /<span class="badge badge-light">(\d+)<\/span>/,
    (match, count) => `<span class="badge badge-light">${parseInt(count) + 1}</span>`
  );

  fs.writeFileSync(archivesPath, archivesHtml, 'utf-8');
  console.log('Updated: archives/index.html');
}

// --- Update archives/2026/index.html ---
const year = date.slice(0, 4);
const yearArchivePath = path.join(ROOT, 'archives', year, 'index.html');
if (fs.existsSync(yearArchivePath)) {
  let yearHtml = fs.readFileSync(yearArchivePath, 'utf-8');

  const yearEntry = `<div class="post-preview post-preview-archive-archive">
    <a href="/${slug}/">
        <h1 class="post-title">
            ${escapeHtml(title)}
        </h1>
    </a>
    <p class="post-meta">
        <!-- Date and Author -->

        ${date}
    </p>
</div>`;

  // Insert before the first existing post or before the pagination
  const firstYearPost = '<div class="post-preview post-preview-archive-archive">';
  const yearInsertIdx = yearHtml.indexOf(firstYearPost);
  if (yearInsertIdx !== -1) {
    yearHtml = yearHtml.slice(0, yearInsertIdx) +
      yearEntry + '\n            \n                ' +
      yearHtml.slice(yearInsertIdx);
  } else {
    // No existing posts, insert before pagination
    const paginationMarker = '<div class="archive-before-pagination">';
    const pIdx = yearHtml.indexOf(paginationMarker);
    if (pIdx !== -1) {
      yearHtml = yearHtml.slice(0, pIdx) + yearEntry + '\n            \n            ' + yearHtml.slice(pIdx);
    }
  }

  // Update All count
  yearHtml = yearHtml.replace(
    /<span class="badge badge-secondary">(\d+)<\/span>/,
    (match, count) => `<span class="badge badge-secondary">${parseInt(count) + 1}</span>`
  );

  fs.writeFileSync(yearArchivePath, yearHtml, 'utf-8');
  console.log(`Updated: archives/${year}/index.html`);
}

console.log('\nDone! Post published successfully.');

// --- Helpers ---
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
