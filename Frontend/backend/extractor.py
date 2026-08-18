import os
import tkinter as tk
from tkinter import filedialog

from pypdf import PdfReader
from docx import Document
import pandas as pd


BASE_FOLDER = os.path.dirname(os.path.abspath(__file__))

OUTPUT_FOLDER = os.path.join(
    BASE_FOLDER,
    "extracted_text"
)


def select_file():

    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)

    file_path = filedialog.askopenfilename(
        title="Select Document",
        filetypes=[
            ("Supported Files", "*.pdf *.docx *.txt *.csv"),
            ("PDF Files", "*.pdf"),
            ("DOCX Files", "*.docx"),
            ("TXT Files", "*.txt"),
            ("CSV Files", "*.csv")
        ]
    )

    root.destroy()

    return file_path


def extract_pdf(file_path):

    reader = PdfReader(file_path)

    text = ""

    for page_number, page in enumerate(
        reader.pages,
        start=1
    ):

        page_text = page.extract_text()

        if page_text:

            text += f"\n--- Page {page_number} ---\n"
            text += page_text

    return text


def extract_docx(file_path):

    document = Document(file_path)

    text = ""

    for paragraph in document.paragraphs:

        paragraph_text = paragraph.text.strip()

        if paragraph_text:

            text += paragraph_text + "\n"

    return text


def extract_txt(file_path):

    encodings = [
        "utf-8",
        "utf-8-sig",
        "cp1252",
        "latin1"
    ]

    for encoding in encodings:

        try:

            with open(
                file_path,
                "r",
                encoding=encoding
            ) as file:

                return file.read()

        except UnicodeDecodeError:

            continue

    raise ValueError(
        "Unable to read the TXT file."
    )


def extract_csv(file_path):

    encodings = [
        "utf-8",
        "utf-8-sig",
        "cp1252",
        "latin1"
    ]

    dataframe = None

    last_error = None

    for encoding in encodings:

        try:

            dataframe = pd.read_csv(
                file_path,
                sep=None,
                engine="python",
                encoding=encoding,
                on_bad_lines="skip",
                comment="#"
            )

            break

        except Exception as error:

            last_error = error

    if dataframe is None:

        raise ValueError(
            f"Unable to read CSV file: {last_error}"
        )

    if dataframe.empty:

        return ""

    text = ""

    columns = list(
        dataframe.columns
    )

    text += "--- CSV Columns ---\n"

    text += ", ".join(
        str(column)
        for column in columns
    )

    text += "\n"

    for index, row in dataframe.iterrows():

        text += (
            f"\n--- Row {index + 1} ---\n"
        )

        for column in columns:

            value = row[column]

            if pd.isna(value):

                value = ""

            text += (
                f"{column}: "
                f"{str(value).strip()}\n"
            )

    return text


def clean_text(text):

    cleaned_lines = []

    for line in text.splitlines():

        line = line.strip()

        if line:

            cleaned_lines.append(line)

    return "\n".join(cleaned_lines)


def extract_document(file_path):

    if not os.path.isfile(file_path):

        raise FileNotFoundError(
            "File not found."
        )

    extension = os.path.splitext(
        file_path
    )[1].lower()

    print(
        "\nFile:",
        os.path.basename(file_path)
    )

    print(
        "Type:",
        extension
    )

    if extension == ".pdf":

        text = extract_pdf(file_path)

    elif extension == ".docx":

        text = extract_docx(file_path)

    elif extension == ".txt":

        text = extract_txt(file_path)

    elif extension == ".csv":

        text = extract_csv(file_path)

    else:

        raise ValueError(
            "Unsupported file type. "
            "Use PDF, DOCX, TXT or CSV."
        )

    return clean_text(text)


def save_extracted_text(
    text,
    original_file
):

    os.makedirs(
        OUTPUT_FOLDER,
        exist_ok=True
    )

    file_name = os.path.splitext(
        os.path.basename(original_file)
    )[0]

    output_file = os.path.join(
        OUTPUT_FOLDER,
        file_name + "_extracted.txt"
    )

    with open(
        output_file,
        "w",
        encoding="utf-8"
    ) as file:

        file.write(text)

    return output_file


def main():

    print("=" * 70)
    print("        AI KNOWLEDGE BASE EXTRACTOR")
    print("=" * 70)

    print("\nSupported formats:")
    print("PDF | DOCX | TXT | CSV")

    print("\nSelect a file...")

    file_path = select_file()

    if not file_path:

        print("\nNo file selected.")

        return

    print("\nSelected file:")

    print(
        os.path.basename(file_path)
    )

    print("\n" + "=" * 70)
    print("EXTRACTING TEXT")
    print("=" * 70)

    try:

        extracted_text = extract_document(
            file_path
        )

        if not extracted_text:

            print(
                "\nNo text could be extracted."
            )

            return

        print(
            "\nExtraction successful!"
        )

        print(
            "Characters extracted:",
            len(extracted_text)
        )

        print("\nExtracted text:")
        print("-" * 70)

        print(
            extracted_text[:5000]
        )

        print("-" * 70)

        output_file = save_extracted_text(
            extracted_text,
            file_path
        )

        print(
            "\nExtracted text saved to:"
        )

        print(
            os.path.abspath(output_file)
        )

        print(
            "\nExtraction completed successfully."
        )

    except Exception as error:

        print("\nERROR:")
        print(error)


if __name__ == "__main__":

    main()

