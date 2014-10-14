var bridgedb = require('../index.js');

bridgedb().getOrganismByIdentifier('http://identifiers.org/ncbigene/4292', function(err, organism) {
  console.log('organism by identifier1');
  //console.log(JSON.stringify(organism, null, '\t'));
});
