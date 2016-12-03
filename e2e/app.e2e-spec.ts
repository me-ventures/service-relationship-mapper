import { ServiceRelationshipMapperPage } from './app.po';

describe('service-relationship-mapper App', function() {
  let page: ServiceRelationshipMapperPage;

  beforeEach(() => {
    page = new ServiceRelationshipMapperPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
