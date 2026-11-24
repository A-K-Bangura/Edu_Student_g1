import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { UserProfile } from "../../types/profile";

vi.mock("../../services/upload", () => ({ uploadAvatar: vi.fn() }));
// jsdom can't decode images; shrinking has its own tests (utils/imageResize).
vi.mock("../../utils/imageResize", () => ({
  prepareAvatarImage: vi.fn(async (file: File) => file),
}));

import { uploadAvatar } from "../../services/upload";
import { ProfileHeader } from "./ProfileHeader";

const profile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 1,
  email: "amara.kamara@example.com",
  firstname: "Amara",
  lastname: "Kamara",
  full_name: "Amara Kamara",
  university: { id: 1, name: "Fourah Bay College" },
  faculty: { id: 3, name: "Faculty of Engineering and Architecture" },
  department: { id: 7, name: "Department of Electrical & Electronic Engineering" },
  level: "200",
  profile_completion: 68,
  ...overrides,
});

const renderHeader = (p: UserProfile = profile(), scoreLevel = 1) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <ProfileHeader profile={p} scoreLevel={scoreLevel} />
    </QueryClientProvider>
  );

const png = () => new File(["x"], "me.png", { type: "image/png" });
const fileInput = (container: HTMLElement) =>
  container.querySelector('input[type="file"]') as HTMLInputElement;

beforeEach(() => {
  vi.resetAllMocks();
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
});

describe("ProfileHeader — details", () => {
  it("shows the name and email", () => {
    renderHeader();
    expect(screen.getByRole("heading", { level: 1, name: "Amara Kamara" })).toBeInTheDocument();
    expect(screen.getByText("amara.kamara@example.com")).toBeInTheDocument();
  });

  it("lists university, faculty and department as separate, labelled rows (not one run-on line)", () => {
    renderHeader();

    const details = screen.getByText("University", { selector: "dt" }).closest("dl") as HTMLElement;
    expect(within(details).getAllByRole("term").map((t) => t.textContent)).toEqual([
      "University",
      "Faculty",
      "Department",
    ]);
    expect(within(details).getByText("Fourah Bay College")).toBeInTheDocument();
    expect(
      within(details).getByText("Faculty of Engineering and Architecture")
    ).toBeInTheDocument();
    expect(
      within(details).getByText("Department of Electrical & Electronic Engineering")
    ).toBeInTheDocument();
  });

  it("shows the XP level and the academic year as two clearly different things", () => {
    renderHeader(profile({ level: "200" }), 4);
    expect(screen.getByText("Level 4")).toBeInTheDocument();
    expect(screen.getByText("Year 2")).toBeInTheDocument();
    // The old header printed "Level: Year 2" next to a giant "Level" number.
    expect(screen.queryByText(/Level:/)).not.toBeInTheDocument();
  });

  it("shows an organization for a student who has one instead of a university", () => {
    renderHeader(
      profile({
        university: undefined,
        faculty: undefined,
        department: undefined,
        organization: { id: 9, name: "Code For Sierra Leone" },
      })
    );
    expect(screen.getByText("Organization", { selector: "dt" })).toBeInTheDocument();
    expect(screen.getByText("Code For Sierra Leone")).toBeInTheDocument();
    expect(screen.queryByText("University", { selector: "dt" })).not.toBeInTheDocument();
  });

  it("leaves the details panel out when there's nothing to put in it", () => {
    renderHeader(
      profile({ university: undefined, faculty: undefined, department: undefined, level: undefined })
    );
    expect(screen.queryByRole("term")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Year/)).not.toBeInTheDocument();
  });

  it("copes with the older API shape that sent institutions as plain strings", () => {
    renderHeader(
      profile({
        university: "Njala University" as unknown as UserProfile["university"],
        faculty: undefined,
        department: undefined,
      })
    );
    expect(screen.getByText("Njala University")).toBeInTheDocument();
  });

  it("shows profile completion as an accessible progress bar, clamped to 0-100", () => {
    const { unmount } = renderHeader(profile({ profile_completion: 68 }));
    expect(screen.getByRole("progressbar", { name: "Profile completion" })).toHaveAttribute(
      "aria-valuenow",
      "68"
    );
    expect(screen.getByText("68%")).toBeInTheDocument();
    unmount();

    renderHeader(profile({ profile_completion: 140 }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("omits the completion bar when the API sent none", () => {
    renderHeader(profile({ profile_completion: undefined }));
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});

describe("ProfileHeader — the photo", () => {
  it("shows two-letter initials when there's no photo", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: "View profile photo" })).toHaveTextContent("AK");
  });

  // Tailwind v4 removed the `*-opacity-*` utilities: `bg-white bg-opacity-20`
  // renders as solid white, which is how the avatar became an empty white
  // circle (white initial on white). Opacity belongs in the colour (`bg-black/25`).
  it("doesn't use the removed Tailwind opacity utilities", () => {
    const { container } = renderHeader();
    expect(container.innerHTML).not.toMatch(/(?:bg|text|border)-opacity-/);
  });

  it("shows the photo when there is one", () => {
    const { container } = renderHeader(profile({ avatar_url: "https://res.cloudinary.com/demo/me.jpg" }));
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://res.cloudinary.com/demo/me.jpg"
    );
  });

  it("falls back to initials when the photo can't be loaded, instead of a blank circle", () => {
    const { container } = renderHeader(profile({ avatar_url: "https://res.cloudinary.com/demo/gone.jpg" }));

    fireEvent.error(container.querySelector("img") as HTMLImageElement);

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("button", { name: "View profile photo" })).toHaveTextContent("AK");
  });

  it("tries a replacement photo even though the previous URL failed", () => {
    const view = renderHeader(profile({ avatar_url: "https://res.cloudinary.com/demo/old.jpg" }));
    fireEvent.error(view.container.querySelector("img") as HTMLImageElement);

    view.rerender(
      <QueryClientProvider client={new QueryClient()}>
        <ProfileHeader
          profile={profile({ avatar_url: "https://res.cloudinary.com/demo/new.jpg" })}
          scoreLevel={1}
        />
      </QueryClientProvider>
    );

    expect(view.container.querySelector("img")).toHaveAttribute(
      "src",
      "https://res.cloudinary.com/demo/new.jpg"
    );
  });
});

describe("ProfileHeader — opening the photo", () => {
  const withPhoto = () =>
    renderHeader(profile({ avatar_url: "https://res.cloudinary.com/demo/me.jpg" }));

  it("opens a full-size view when the photo is clicked", async () => {
    withPhoto();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "View profile photo" }));

    const dialog = screen.getByRole("dialog", { name: "Profile photo" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByAltText("Amara Kamara's profile photo")).toHaveAttribute(
      "src",
      "https://res.cloudinary.com/demo/me.jpg"
    );
    expect(within(dialog).getByRole("button", { name: "Change photo" })).toBeInTheDocument();
  });

  it("closes with the close button, with Escape, and by clicking outside the photo", async () => {
    withPhoto();
    const open = () => userEvent.click(screen.getByRole("button", { name: "View profile photo" }));

    await open();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await open();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await open();
    await userEvent.click(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stays open when the photo itself is clicked", async () => {
    withPhoto();
    await userEvent.click(screen.getByRole("button", { name: "View profile photo" }));

    await userEvent.click(screen.getByAltText("Amara Kamara's profile photo"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("moves focus into the dialog, keeps Tab inside it, and gives focus back to the photo on close", async () => {
    withPhoto();
    const avatar = screen.getByRole("button", { name: "View profile photo" });
    await userEvent.click(avatar);

    const close = screen.getByRole("button", { name: "Close" });
    const change = screen.getByRole("button", { name: "Change photo" });
    expect(close).toHaveFocus();

    await userEvent.tab();
    expect(change).toHaveFocus();
    await userEvent.tab(); // wraps instead of escaping to the page behind
    expect(close).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(change).toHaveFocus();

    await userEvent.keyboard("{Escape}");
    expect(avatar).toHaveFocus();
  });

  it("offers 'Add a photo' with their initials when there's no photo yet", async () => {
    renderHeader();
    await userEvent.click(screen.getByRole("button", { name: "View profile photo" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("AK")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Add a photo" })).toBeInTheDocument();
  });
});

describe("ProfileHeader — changing the photo", () => {
  it("opens the file picker from the camera badge, limited to the types the backend accepts", async () => {
    const { container } = renderHeader();
    const input = fileInput(container);
    const pick = vi.spyOn(input, "click");

    await userEvent.click(screen.getByRole("button", { name: "Change profile photo" }));

    expect(pick).toHaveBeenCalledTimes(1);
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
  });

  it("opens the same picker from inside the viewer", async () => {
    const { container } = renderHeader();
    const pick = vi.spyOn(fileInput(container), "click");
    await userEvent.click(screen.getByRole("button", { name: "View profile photo" }));

    await userEvent.click(screen.getByRole("button", { name: "Add a photo" }));

    expect(pick).toHaveBeenCalledTimes(1);
  });

  it("uploads the chosen photo and closes the viewer so the result is visible", async () => {
    vi.mocked(uploadAvatar).mockResolvedValue({ file_upload: { id: 1 } } as never);
    const { container } = renderHeader();
    await userEvent.click(screen.getByRole("button", { name: "View profile photo" }));
    const file = png();

    await userEvent.upload(fileInput(container), file);

    await waitFor(() => expect(uploadAvatar).toHaveBeenCalledTimes(1));
    // Identity, not equality: two different `File`s compare as equal.
    expect(vi.mocked(uploadAvatar).mock.calls[0][0]).toBe(file);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows progress while uploading and blocks a second pick", async () => {
    let finish!: () => void;
    vi.mocked(uploadAvatar).mockReturnValue(
      new Promise((resolve) => {
        finish = () => resolve({ file_upload: { id: 1 } } as never);
      })
    );
    const { container } = renderHeader();

    await userEvent.upload(fileInput(container), png());

    expect(await screen.findByRole("status", { name: "Uploading photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change profile photo" })).toBeDisabled();

    finish();
    await waitFor(() =>
      expect(screen.queryByRole("status", { name: "Uploading photo" })).not.toBeInTheDocument()
    );
  });

  it("tells the student when an upload fails — it used to fail silently", async () => {
    vi.mocked(uploadAvatar).mockRejectedValue(new Error("Invalid Signature abc"));
    const { container } = renderHeader();

    await userEvent.upload(fileInput(container), png());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/couldn't upload your photo/i);
    // Cloudinary's technical wording stays out of the UI.
    expect(alert).not.toHaveTextContent(/signature/i);
  });

  it("lets the student pick the very same file again to retry", async () => {
    vi.mocked(uploadAvatar)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ file_upload: { id: 1 } } as never);
    const { container } = renderHeader();
    const file = png();

    await userEvent.upload(fileInput(container), file);
    await screen.findByRole("alert");
    // A browser only fires `change` when the selection differs from the last
    // one, so the input must have been emptied for the same file to count again.
    expect(fileInput(container).files).toHaveLength(0);

    await userEvent.upload(fileInput(container), file); // same file object

    await waitFor(() => expect(uploadAvatar).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("rejects the wrong kind of file with a clear message, before any upload", async () => {
    const { container } = renderHeader();
    // `applyAccept: false` stands in for choosing "All files" in the picker.
    const user = userEvent.setup({ applyAccept: false });

    await user.upload(fileInput(container), new File(["x"], "me.gif", { type: "image/gif" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/JPEG, PNG or WebP/);
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it("lets the message be dismissed", async () => {
    const { container } = renderHeader();
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(fileInput(container), new File(["x"], "me.gif", { type: "image/gif" }));
    await screen.findByRole("alert");

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("announces a successful change to screen readers", async () => {
    vi.mocked(uploadAvatar).mockResolvedValue({ file_upload: { id: 1 } } as never);
    const { container } = renderHeader();

    await userEvent.upload(fileInput(container), png());

    await waitFor(() =>
      expect(screen.getByText("Profile photo updated")).toBeInTheDocument()
    );
  });
});
