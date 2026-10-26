1. **Add ESLint Guards**: Add the required `eslint-disable` comments to `src/components/AiVideoPlayer.tsx`, `src/app/page.tsx`, and `src/app/api/line/route.ts`.
2. **Create `AiVideoPlayer` Component**: Implement `src/components/AiVideoPlayer.tsx` according to the full v6.2 specification (React 19 types, HTML overlay, Canvas overlay, MP4 export, styling and strict hiding rules).
3. **Update `src/app/page.tsx`**: Add `isPreviewMode` check via `params.get("preview") === "video"`, fetch scripts and drafts from the LINE API, conditionally display the review banner, and integrate `<AiVideoPlayer />` in place of the old `<video>` elements.
4. **Update `src/app/api/line/route.ts`**: Update the `GET` method to return `site_ai_video_script`, `site_promo_video_draft`, and `site_ai_video_script_draft`. Add support for `AI製片：[主題提示]`, `修改製片：[修改要求]`, `重新製片`, `確認上架影片`, and `取消上架影片` in the `POST` method.
5. **Run Pre-commit Checks**: Run `npx tsc --noEmit` and any other required `AGENTS.md` verifications as specified.
6. **Submit PR**: Commit and push with descriptive messages.
