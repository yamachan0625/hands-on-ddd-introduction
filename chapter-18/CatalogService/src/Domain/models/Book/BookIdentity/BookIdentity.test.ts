import { Author } from '../Author/Author';
import { BookId } from '../BookId/BookId';
import { Title } from '../Title/Title';
import { BookIdentity } from './BookIdentity';

describe('BookIdentity', () => {
  it('同じIDを持つエンティティは等価である', () => {
    const id = new BookId('9784798126708');
    const identity1 = new BookIdentity(
      id,
      new Title('エリック・エヴァンスのドメイン駆動設計'),
      new Author('エリック・エヴァンス')
    );
    const identity2 = new BookIdentity(
      id,
      new Title('エヴァンス本'),
      new Author('エヴァンス')
    ); // タイトルや著者の表記が異なる

    expect(identity1.equals(identity2)).toBeTruthy();
  });

  it('異なるIDを持つエンティティは等価でない', () => {
    const id1 = new BookId('9784798126708');
    const id2 = new BookId('9784798131610');
    const identity1 = new BookIdentity(
      id1,
      new Title('エリック・エヴァンスのドメイン駆動設計'),
      new Author('エリック・エヴァンス')
    );
    const identity2 = new BookIdentity(
      id2,
      new Title('エリック・エヴァンスのドメイン駆動設計'),
      new Author('エリック・エヴァンス')
    ); // タイトルと著者は同じ

    expect(identity1.equals(identity2)).toBeFalsy();
  });
});
