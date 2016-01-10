#!/usr/bin/env node

var fs = require('fs'),
    child = require('child_process'),
    inspect = require('util').inspect;
var Imap = require('imap');


function die(retCode, msg) {
  console.error(msg);
  process.exit(retCode);
}

function openInbox(cb) {
  var readonly = false;
  return imap.openBox('INBOX', readonly, cb);
}


var configPath = process.argv[2];
if (! fs.existsSync(configPath)) {
  die(2, 'Config file does not exist');
}

try {
  var config = require(configPath);
} catch(err) {
  die(3, 'Parsing error: ' + err);
}


var imap = new Imap(config.imap);

imap.once('ready', function() {
  console.info("Connected to IMAP server: "+config.imap.host);
  var inbox = openInbox(function(err, box) {
    if (err) throw err;

    fetchMessages(['ALL']);

    imap.on('mail', function(numNewMsgs) {
      console.info("New mail: "+numNewMsgs);
      fetchMessages(['UNDELETED']);  // UNSEEN, NEW
    });
  });
});

function fetchMessages(criteria) {
  imap.search(criteria, function(err, uids) {
    if (err) throw err;
    if (!uids.length) return;

    var f = imap.fetch(uids, { bodies: '' });
    f.on('message', function(msg, seqno) {
      console.info('Downloaded message #%d', seqno);
      msg.on('body', function(stream, info) {
        var mda = child.spawn(config.mda.cmd, config.mda.args,
                              {stdio: ['pipe', 1, 2]});
        mda.on('error', function(err) {
          console.error('Failed to start MDA: ' + err);
        });
        stream.pipe(mda.stdin);
      });
    });
    f.once('error', function(err) {
      console.error('Fetch error: ' + err);
    });
    f.once('end', function() {
      imap.addFlags(uids, '\\Deleted', function(err) {
        if (err) console.error("addFlags failed: " + err);
        imap.expunge(uids, function(err) {  // uids for UIDPLUS
          if (err) console.error("Expunge failed: " + err);
        });
      });
    });
  });
};

imap.on('error', function(err) {
  console.error("Connection error: " + err);
});

imap.once('end', function() {
  console.log('Connection ended');
});


function quit() {
  var autoExpunge = true;
  imap.closeBox(autoExpunge, function() { // on currently opened box
    imap.end();
  });
}

process.on('SIGINT', function() {
  console.info("Caught interrupt signal");
  quit();
});

process.on('SIGTERM', function() {
  console.info("Caught termination signal");
  quit();
});

imap.connect();
