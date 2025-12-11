// ===== CLOCK =====
function updateFootClock(){
  const n = new Date();
  const hh = String(n.getHours()).padStart(2,'0');
  const mm = String(n.getMinutes()).padStart(2,'0');
  const ss = String(n.getSeconds()).padStart(2,'0');
  document.getElementById("footTime").textContent = `${hh}:${mm}:${ss}`;
  document.getElementById("footDate").textContent =
    n.toLocaleDateString(undefined,{
      weekday:'short', day:'numeric', month:'short', year:'numeric'
    });
}
setInterval(updateFootClock,1000);
updateFootClock();

// ===== LOCAL VISITOR COUNTER (calls CGI on same server) =====

// create / read browser-unique id (to count "unique visitors")
(function(){
  if(!localStorage.getItem('libVisitorUID')){
    const uid = 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    localStorage.setItem('libVisitorUID', uid);
  }
})();

async function loadVisitorStats(){
  const uid = encodeURIComponent(localStorage.getItem('libVisitorUID') || '');
  try{
    const res = await fetch(`/cgi-bin/koha/visitor_counter.pl?uid=${uid}`, {cache:'no-store'});
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    document.getElementById("visUnique").textContent = (data.unique || 0).toLocaleString();
    document.getElementById("visToday").textContent  = (data.today  || 0).toLocaleString();
    document.getElementById("visTotal").textContent  = (data.total  || 0).toLocaleString();
  }catch(e){
    console.error('Visitor counter error:', e);
    document.getElementById("visUnique").textContent = 'N/A';
    document.getElementById("visToday").textContent  = 'N/A';
    document.getElementById("visTotal").textContent  = 'N/A';
  }
}
loadVisitorStats();

// ===== YEAR =====
document.getElementById("footerYear").textContent = new Date().getFullYear();


$("div[id^='page_'] h1").hide();


// ====OPAC New Arrivals List====
$(document).ready(function () {

    // ----- CONFIG -----
    var reportId = 29; // report id
    var highlightDays = 7; // highlight items added in last X days

    // If table not present, do nothing
    if (!$('#latestBooksTable').length) return;

    // ----- Load DataTables + Buttons + dependencies from CDNs -----
    var cssFiles = [
        'https://cdn.datatables.net/1.13.8/css/jquery.dataTables.min.css',
        'https://cdn.datatables.net/buttons/2.4.2/css/buttons.dataTables.min.css'
    ];

    cssFiles.forEach(function (href) {
        if ($('link[href="' + href + '"]').length === 0) {
            $('<link>', {
                rel: 'stylesheet',
                type: 'text/css',
                href: href
            }).appendTo('head');
        }
    });

    var jsFiles = [
        'https://cdn.datatables.net/1.13.8/js/jquery.dataTables.min.js',
        'https://cdn.datatables.net/buttons/2.4.2/js/dataTables.buttons.min.js',
        'https://cdn.datatables.net/buttons/2.4.2/js/buttons.html5.min.js',
        'https://cdn.datatables.net/buttons/2.4.2/js/buttons.print.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js'
    ];

    function loadScriptsSequentially(index, callback) {
        if (index >= jsFiles.length) {
            callback();
            return;
        }
        $.getScript(jsFiles[index])
            .done(function () {
                loadScriptsSequentially(index + 1, callback);
            })
            .fail(function () {
                console.log('Failed to load script:', jsFiles[index]);
                loadScriptsSequentially(index + 1, callback); // try to continue anyway
            });
    }

    loadScriptsSequentially(0, initLatestBooksTable);

    // ----- Helper: escape HTML -----
    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ----- Main initialisation -----
    function initLatestBooksTable() {
        var $table = $('#latestBooksTable');
        var $tbody = $table.find('tbody');

        $.getJSON('/cgi-bin/koha/svc/report', {
            id: reportId,
            format: 'json'
        }).done(function (data) {

            $tbody.empty();

            if (!Array.isArray(data) || data.length === 0) {
                $tbody.append('<tr><td colspan="4" class="text-center">No records found.</td></tr>');
                return;
            }

            var today = new Date();
            today.setHours(0, 0, 0, 0);

            data.forEach(function (row) {
                // JSON layout:
                // [biblionumber, isbn, title, author, dateaccessioned]
                var biblionumber    = row[0];
                var isbn            = row[1] || '';
                var title           = row[2] || '';
                var author          = row[3] || '';
                var dateaccessioned = row[4] || '';

                // Check if "new" (within highlightDays)
                var isNew = false;
                if (dateaccessioned) {
                    var d = new Date(dateaccessioned);
                    if (!isNaN(d.getTime())) {
                        d.setHours(0, 0, 0, 0);
                        var diffMs = today - d;
                        var diffDays = diffMs / (1000 * 60 * 60 * 24);
                        if (diffDays >= 0 && diffDays <= highlightDays) {
                            isNew = true;
                        }
                    }
                }

                var newBadge = isNew
                    ? ' <span class="badge bg-warning text-dark ms-1">New</span>'
                    : '';

                var detailUrl = '/cgi-bin/koha/opac-detail.pl?biblionumber=' +
                                encodeURIComponent(biblionumber);

                var trClass = isNew ? ' class="latest-new-row"' : '';

                // *** NO COVER COLUMN HERE ***
                var rowHtml =
                    '<tr' + trClass + '>' +
                        '<td>' +
                            '<a href="' + detailUrl + '" target="_blank" ' +
                               'class="fw-semibold text-decoration-none">' +
                                escapeHtml(title) +
                            '</a>' +
                            newBadge +
                        '</td>' +
                        '<td>' + escapeHtml(author) + '</td>' +
                        '<td>' + escapeHtml(isbn) + '</td>' +
                        '<td>' + escapeHtml(dateaccessioned) + '</td>' +
                    '</tr>';

                $tbody.append(rowHtml);
            });

            // Initialise DataTable: sorting + export buttons (Excel, PDF, Print)
            if ($.fn.DataTable) {
                $table.DataTable({
                    // now: 0=Title, 1=Author, 2=ISBN, 3=Date
                    order: [[3, 'desc']],
                    pageLength: 10,
                    lengthMenu: [10, 25, 50, 100],
                    dom: 'Bfrtip',
                    buttons: [
                        {
                            extend: 'excelHtml5',
                            title: 'Latest Books Added'
                        },
                        {
                            extend: 'pdfHtml5',
                            title: 'Latest Books Added',
                            orientation: 'landscape',
                            pageSize: 'A4'
                        },
                        {
                            extend: 'print',
                            title: 'Latest Books Added'
                        }
                    ]
                });
            }

        }).fail(function (jqXHR, textStatus, errorThrown) {
            console.log('Error loading report JSON:', textStatus, errorThrown);
            $('#latestBooksTable tbody').html(
                '<tr><td colspan="4" class="text-danger text-center">' +
                'Unable to load latest books.</td></tr>'
            );
        });
    }

});


//====PAGES====
document.addEventListener('DOMContentLoaded', function(){
  const cards = document.querySelectorAll('.rules-accordion .card');

  cards.forEach(card => {
    const header = card.querySelector('.card-header');
    const body   = card.querySelector('.card-body');

    // ensure bodies are hidden initially
    body.style.display = 'none';
    body.setAttribute('aria-hidden','true');
    header.setAttribute('tabindex','0'); // keyboard focusable

    const indicator = header.querySelector('.acc-indicator');

    function openBody(){
      // close other cards (one-open behavior)
      cards.forEach(c => {
        c.querySelector('.card-body').style.display='none';
        c.querySelector('.card-body').setAttribute('aria-hidden','true');
        c.querySelector('.card-header').setAttribute('aria-expanded','false');
        c.querySelector('.acc-indicator').textContent = '+';
      });
      body.style.display = 'block';
      body.setAttribute('aria-hidden','false');
      header.setAttribute('aria-expanded','true');
      indicator.textContent = '−';
    }
    function toggle(){
      if(body.style.display === 'none') openBody();
      else {
        body.style.display='none';
        body.setAttribute('aria-hidden','true');
        header.setAttribute('aria-expanded','false');
        indicator.textContent = '+';
      }
    }

    header.addEventListener('click', toggle);
    header.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  // Print button
  const printBtn = document.getElementById('printRulesBtn');
  if(printBtn) printBtn.addEventListener('click', ()=> window.print());
});