import express, { json } from "express";
// Reflectのポリフィルをcontainer.resolveされる前に一度読み込む必要がある
import "reflect-metadata";
import { container } from "tsyringe";

import {
  RegisterBookCommand,
  RegisterBookService,
} from "Application/Book/RegisterBookService/RegisterBookService";
import {
  AddReviewCommand,
  AddReviewService,
} from "Application/Review/AddReviewService/AddReviewService";
import {
  DeleteReviewCommand,
  DeleteReviewService,
} from "Application/Review/DeleteReviewService/DeleteReviewService";
import {
  EditReviewCommand,
  EditReviewService,
} from "Application/Review/EditReviewService/EditReviewService";
import {
  GetRecommendedBooksCommand,
  GetRecommendedBooksService,
} from "Application/Review/GetRecommendedBooksService/GetRecommendedBooksService";

import "../../Program";

const app = express();
const port = 3000;

// JSON形式のリクエストボディを正しく解析するために必要
app.use(json());

// 中核ユースケース: レビュー内容から推薦書籍を取得
app.get("/book/:isbn/recommendations", async (req, res) => {
  try {
    const getRecommendedBooksService = container.resolve(
      GetRecommendedBooksService
    );

    const command: GetRecommendedBooksCommand = {
      bookId: req.params.isbn,
      maxCount: req.query.maxCount
        ? parseInt(req.query.maxCount as string)
        : undefined,
    };

    const recommendedBooks = await getRecommendedBooksService.execute(command);

    res.status(200).json({ ok: true, recommendedBooks });
  } catch {
    res.status(500).json({ ok: false });
  }
});

// 書籍登録
app.post("/book", async (req, res) => {
  try {
    const requestBody = req.body as {
      isbn: string;
      title: string;
      author: string;
      price: number;
    };

    const registerBookService = container.resolve(RegisterBookService);

    const registerBookCommand: RegisterBookCommand = requestBody;
    const book = await registerBookService.execute(registerBookCommand);

    res.status(201).json({ ok: true, book });
  } catch {
    res.status(500).json({ ok: false });
  }
});

// レビュー投稿
app.post("/book/:isbn/review", async (req, res) => {
  try {
    const requestBody = req.body as {
      name: string;
      rating: number;
      comment?: string;
    };

    const addReviewService = container.resolve(AddReviewService);

    const addReviewCommand: AddReviewCommand = {
      bookId: req.params.isbn,
      ...requestBody,
    };
    const review = await addReviewService.execute(addReviewCommand);

    res.status(201).json({ ok: true, review });
  } catch {
    res.status(500).json({ ok: false });
  }
});

// レビュー編集
app.put("/review/:reviewId", async (req, res) => {
  try {
    const requestBody = req.body as {
      name?: string;
      rating?: number;
      comment?: string;
    };

    const editReviewService = container.resolve(EditReviewService);

    const editReviewCommand: EditReviewCommand = {
      reviewId: req.params.reviewId,
      ...requestBody,
    };
    const review = await editReviewService.execute(editReviewCommand);

    res.status(200).json({ ok: true, review });
  } catch {
    res.status(500).json({ ok: false });
  }
});

// レビュー削除
app.delete("/review/:reviewId", async (req, res) => {
  try {
    const deleteReviewService = container.resolve(DeleteReviewService);

    const deleteReviewCommand: DeleteReviewCommand = {
      reviewId: req.params.reviewId,
    };
    await deleteReviewService.execute(deleteReviewCommand);

    res.status(204).end();
  } catch {
    res.status(500).json({ ok: false });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
