var fs = require('fs'),
    child = require('child_process'),
    inspect = require('util').inspect;
var Imap = require('imap');


var MDA      = 'maildrop';
var MDA_ARGS = [];


function getStdout(cmd) {
  var stdout = child.execSync(cmd);
  return stdout.toString().trim();
}

function openInbox(cb) {
  var readonly = true;
  var box = imap.openBox('INBOX', readonly, cb);
}


var host = 'imap.domain.tld';

var imap = new Imap({
  user: 'user@domain.tld',
  password: getStdout("gpg -q --for-your-eyes-only --no-tty -d "
                      + "~/.authinfo.gpg |getauth.pl " + host),
  host: host,
  port: 993,
  tls: true,
  tlsOptions: {
    ca: [ fs.readFileSync('/etc/ssl/certs/My_Certificate_Authority.pem') ]
  },
  keepalive: true,
  // debug: function(str){console.log("DEBUG: "+str);}
});

imap.once('ready', function() {
  // we need to open INBOX once to trigger `mail'.
  openInbox(function(err, box) {
    if (err) throw err;
  });
});

imap.on('mail', function(numNewMsgs) {
  // console.log("--mail-- "+numNewMsgs);
  openInbox(function(err, box) {
    if (err) throw err;
    imap.search(['NEW'], function(err, results) {
      if (err) throw err;

      var f = imap.fetch(results, { bodies: '' });

      f.on('message', function(msg, seqno) {
        console.log('Message #%d', seqno);
        var prefix = '(#' + seqno + ') ';
        msg.on('body', function(stream, info) {
          console.log(prefix + 'Body');
          var mda = child.spawn(MDA, MDA_ARGS, {stdio: ['pipe', 1, 2]});
          stream.pipe(mda.stdin);
        });
        msg.once('attributes', function(attrs) {
          console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
        });
        msg.once('end', function() {
          console.log(prefix + 'Finished');
        });
      });
      f.once('error', function(err) {
        console.log('Fetch error: ' + err);
      });
      f.once('end', function() {
        console.log('Done fetching all messages!');
      });

    });
  });
});

imap.once('error', function(err) {
  console.log(err);
});

imap.once('end', function() {
  console.log('Connection ended');
});


process.on('SIGINT', function() {
  console.log("Caught interrupt signal");
  imap.end();
});

imap.connect();
